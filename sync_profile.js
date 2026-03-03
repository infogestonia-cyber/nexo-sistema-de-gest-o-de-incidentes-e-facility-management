import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function syncProfile() {
    console.log("Checking for authenticated users without profiles...");

    // Try to login if credentials are known, or prompt user. Note: Anon key can only list profiles, not all auth users.
    // We'll write this script so the user can just log in once and it forcefully creates the profile.
    const email = process.argv[2] || 'admin@nexo.com';
    const password = process.argv[3] || 'admin123';

    console.log(`Trying to login with ${email}...`);
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authErr) {
        console.error("Login failed! Ensure the user is created in Auth and the password is correct.");
        console.error("Error:", authErr.message);
        return;
    }

    const userId = auth.user.id;
    console.log("Login successful! User ID:", userId);

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (profile) {
        console.log("Profile already exists:", profile);
    } else {
        console.log("Profile not found. Creating a new profile for this user...");
        const { data: newProfile, error: insertErr } = await supabase.from('profiles').insert([{
            id: userId,
            nome: email.split('@')[0], // Default name
            email: email,
            perfil: "Administrador" // Default role
        }]).select().single();

        if (insertErr) {
            console.error("Error creating profile:", insertErr.message);
        } else {
            console.log("Profile created successfully!", newProfile);
        }
    }
}

syncProfile();
