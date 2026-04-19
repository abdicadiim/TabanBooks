import React from "react";
import NewTaxModal from "../modals/NewTaxModal";

type NewTaxQuickModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (tax: any) => void;
};

export default function NewTaxQuickModal({ open, onClose, onCreated }: NewTaxQuickModalProps) {
  return <NewTaxModal isOpen={open} onClose={onClose} onCreated={onCreated} />;
}
