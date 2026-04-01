// src/lib/mailer.ts
// Instância singleton do Resend — importar daqui em vez de instanciar localmente em cada módulo

import { Resend } from "resend";
import { env }    from "../config/env";

export const resend = new Resend(env.RESEND_API_KEY);
