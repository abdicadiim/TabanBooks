import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import CreditNotes from "./CreditNotes";
import NewCreditNote from "./NewCreditNote/NewCreditNote";
import ImportCreditNotes from "./ImportCreditNotes/ImportCreditNotes";
import CreditNoteDetail from "./CreditNoteDetail/CreditNoteDetail";
import SendCreditNoteEmail from "./SendCreditNoteEmail/SendCreditNoteEmail";
import CreditNoteJournalReport from "./CreditNoteJournalReport";

export default function CreditNotesRoutes() {
  return (
    <Routes>
      <Route index element={<CreditNotes />} />
      <Route path="new" element={<NewCreditNote />} />
      <Route path="import" element={<ImportCreditNotes />} />
      <Route path="import-applied" element={<ImportCreditNotes />} />
      <Route path="import-refunds" element={<ImportCreditNotes />} />
      <Route path="custom-view/new" element={<CreditNotes />} />
      <Route path=":id/edit" element={<NewCreditNote />} />
      <Route path=":id/email" element={<SendCreditNoteEmail />} />
      <Route path="journal" element={<CreditNoteJournalReport />} />
      <Route path=":id/journal" element={<CreditNoteJournalReport />} />
      <Route path=":id" element={<CreditNoteDetail />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
