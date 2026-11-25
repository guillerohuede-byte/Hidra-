import type { Metadata } from "next";
import NfcRegister from "@/components/NfcRegister";

// Ruta que abre el sticker: https://<dominio>/nfc/<código de la botella>
export const metadata: Metadata = { title: "Registrar con NFC" };

export default async function NfcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let code = id;
  try {
    code = decodeURIComponent(id);
  } catch {
    /* código mal formado: lo valida NfcRegister */
  }
  return <NfcRegister code={code.trim().toUpperCase()} />;
}
