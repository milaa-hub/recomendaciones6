
const SUPABASE_URL = 'https://byxqznicohlojeqrxcli.supabase.co';

const SUPABASE_KEY = 'sb_publishable_9g17kGKKB4svHGfpZNUbXA_5PczqoES';

// Crear el cliente de Supabase
window.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
