import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CurrenciesPage from "./CurrenciesPage";
import CurrencyExchangeRatesPage from "./CurrencyExchangeRatesPage";
const ImportExchangeRates = lazy(() => import("./ImportExchangeRates"));
const ExportExchangeRatesPage = lazy(() => import("./ExportExchangeRatesPage"));

function CurrencyRouteFallback() {
    return (
        <div className="min-h-[30vh] flex items-center justify-center text-sm text-gray-500">
            Loading currency tools...
        </div>
    );
}

export default function CurrenciesRouter() {
    return (
        <Suspense fallback={<CurrencyRouteFallback />}>
            <Routes>
                <Route path="/" element={<CurrenciesPage />} />
                <Route path="import" element={<ImportExchangeRates />} />
                <Route path="export" element={<ExportExchangeRatesPage />} />
                <Route path=":id/exchange-rates" element={<CurrencyExchangeRatesPage />} />
                <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
        </Suspense>
    );
}
