/**
 * Maintenance Scheduler Module
 * Runs every hour to auto-generate maintenance execution plans from schedules
 * Based on triggers: calendar frequency, usage thresholds, meter readings
 */

import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Server } from "socket.io";

export interface MaintenanceSchedule {
  id: string;
  asset_id: string;
  name: string;
  description: string;
  trigger_type: 'calendar' | 'usage_threshold' | 'meter_reading';
  frequency_days?: number;
  last_execution_date?: string;
  next_execution_date?: string;
  threshold_value?: number;
  categoria: string;
  estimated_cost: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface MaintenanceExecution {
  id: string;
  schedule_id: string;
  asset_id: string;
  assigned_to?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  estimated_cost: number;
  actual_cost?: number;
  observations?: string;
  created_by: string;
  created_at: string;
}

type LogLevel = 'INFO' | 'ERROR' | 'WARNING' | 'DEBUG';

export class MaintenanceScheduler {
  private supabase: SupabaseClient;
  private logToFile: (level: LogLevel, message: string, data?: any) => void;
  private io: Server | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient, logToFile: (level: LogLevel, message: string, data?: any) => void, io?: Server) {
    this.supabase = supabase;
    this.logToFile = logToFile;
    if (io) this.io = io;
  }

  /**
   * Start the scheduler - runs every hour
   */
  public start() {
    this.logToFile("INFO", "Iniciando Maintenance Scheduler (a cada 1 hora)");
    
    // Run immediately on startup
    this.run();

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.run();
    }, 3600000); // 1 hour
  }

  /**
   * Stop the scheduler
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logToFile("INFO", "Maintenance Scheduler parado");
    }
  }

  /**
   * Main scheduler logic - check all active schedules and create executions if needed
   */
  private async run() {
    try {
      this.logToFile("DEBUG", "Executando verificação de agendamentos de manutenção");

      // Fetch all active schedules from pm_schedules table (automation/scheduling data)
      const { data: schedules, error: schedError } = await this.supabase
        .from('pm_schedules')
        .select('*')
        .eq('is_active', true);

      // Check if table doesn't exist (first run scenario)
      if (schedError?.message?.includes('find the table')) {
        this.logToFile("WARNING", "Tabela 'pm_schedules' não encontrada no Supabase. Crie-a manualmente com os campos: asset_id, task_description, frequency_days, threshold_value, categoria, created_by, created_at, is_active, last_execution_date");
        return;
      }

      if (schedError) {
        this.logToFile("ERROR", "Erro ao buscar pm_schedules", { error: schedError.message });
        return;
      }

      if (!schedules || schedules.length === 0) {
        this.logToFile("DEBUG", "Nenhum agendamento ativo encontrado");
        return;
      }

      this.logToFile("DEBUG", "Verificando agendamentos", { count: schedules.length });

      let createdCount = 0;

      for (const schedule of schedules) {
        try {
          const shouldCreate = this.checkIfExecutionNeeded(schedule);

          if (shouldCreate) {
            await this.createExecutionFromSchedule(schedule);
            createdCount++;
          }
        } catch (error: any) {
          this.logToFile("ERROR", "Erro ao processar agendamento", { 
            schedule_id: schedule.id,
            error: error.message 
          });
        }
      }

      if (createdCount > 0) {
        this.logToFile("INFO", "Planos de manutenção auto-gerados", { count: createdCount });
      }
    } catch (error: any) {
      this.logToFile("ERROR", "Erro geral no scheduler de manutenção", { error: error.message });
    }
  }

  /**
   * Check if a schedule should trigger a new execution
   * For pm_schedules: checks if frequency_days has passed since last execution
   */
  private checkIfExecutionNeeded(schedule: any): boolean {
    // Only process calendar-based schedules (those with frequency_days)
    if (!schedule.frequency_days) {
      return false; // Skip schedules without frequency_days
    }

    const lastExecDate = schedule.last_execution_date 
      ? new Date(schedule.last_execution_date)
      : new Date(schedule.created_at);

    const daysPassed = Math.floor(
      (Date.now() - lastExecDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const shouldTrigger = daysPassed >= schedule.frequency_days;
    
    if (shouldTrigger) {
      this.logToFile("DEBUG", "Gatilho de agendamento atendido", {
        schedule_id: schedule.id,
        frequency_days: schedule.frequency_days,
        daysPassed
      });
    }

    return shouldTrigger;
  }

  /**
   * Create a new maintenance plan from a schedule
   * Converts a pm_schedule into a maintenance_plan execution
   */
  private async createExecutionFromSchedule(schedule: any) {
    const planId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Calculate next execution date
    const nextExecDate = new Date(now);
    nextExecDate.setDate(nextExecDate.getDate() + schedule.frequency_days);

    // Create maintenance_plan record from pm_schedule
    const maintenancePlan = {
      id: planId,
      asset_id: schedule.asset_id,
      tipo: schedule.categoria || 'Preventiva Automática',
      periodicidade: `${schedule.frequency_days} dias`,
      proxima_data: nextExecDate.toISOString().split('T')[0],
      responsavel_id: schedule.created_by, // Use creator as responsible (or assign to manager)
      custo_estimado: 0, // Will be updated after work
      descricao: schedule.task_description || `Manutenção automática: ${schedule.categoria}`,
      criado_em: now,
      auto_generated: true // Flag to track auto-generated plans
    };

    // Insert execution into maintenance_plans table
    const { error: execError } = await this.supabase
      .from('maintenance_plans')
      .insert([maintenancePlan]);

    if (execError) {
      throw new Error(`Erro ao criar plano de manutenção: ${execError.message}`);
    }

    // Update pm_schedule with new execution date
    const nextExecutionDate = new Date();
    nextExecutionDate.setDate(nextExecutionDate.getDate() + (schedule.frequency_days || 30));

    const { error: updateError } = await this.supabase
      .from('pm_schedules')
      .update({
        last_execution_date: now
      })
      .eq('id', schedule.id);

    if (updateError) {
      this.logToFile("WARNING", "Erro ao atualizar last_execution_date do agendamento", { 
        schedule_id: schedule.id,
        error: updateError.message 
      });
    }

    // Create notification for creator/manager
    if (schedule.created_by) {
      const notif = {
        id: crypto.randomUUID(),
        user_id: schedule.created_by,
        titulo: '🔧 Novo Plano de Manutenção Auto-gerado',
        mensagem: `Um plano de manutenção ${schedule.categoria} foi criado automaticamente para o ativo ${schedule.asset_id}. Revisar no módulo de Manutenção.`,
        lida: false,
        created_at: now
      };

      try {
        await this.supabase.from('notifications').insert([notif]);
        this.logToFile("DEBUG", "Notificação criada para o criador do agendamento");
        
        // Emit via socket for real-time update
        if (this.io) {
          this.io.emit("notification", { 
            userId: schedule.created_by, 
            titulo: notif.titulo, 
            mensagem: notif.mensagem 
          });
        }
      } catch (err: any) {
        this.logToFile("WARNING", "Erro ao criar notificação", { error: err.message });
      }
    }

    this.logToFile("INFO", "Plano de manutenção auto-gerado", {
      plan_id: planId,
      schedule_id: schedule.id,
      asset_id: schedule.asset_id,
      categoria: schedule.categoria,
      tipo: maintenancePlan.tipo
    });
  }
}
