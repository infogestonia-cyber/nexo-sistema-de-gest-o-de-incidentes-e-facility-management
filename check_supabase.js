import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAdmin() {
    console.log("Checking Admin Profile...");
    const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('email', 'admin@nexo.com');
    console.log("Profile Data:", profile);
    console.log("Profile Error:", profileErr);

    console.log("Trying Login...");
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@nexo.com',
        password: 'admin123'
    });
    console.log("Auth User ID:", auth?.user?.id);
    console.log("Auth Error:", authErr?.message);
}

checkAdmin();
