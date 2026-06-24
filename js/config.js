// Configuración de Supabase
const SUPABASE_URL = 'https://wdchydkreafsifqqequa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkY2h5ZGtyZWFmc2lmcXFlcXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk4NzEsImV4cCI6MjA5NzkwNTg3MX0.zV8KBiS57WokAm40BPdfHFM711W97IcAPMrGtaXXGWE';

// Crear el cliente de Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
