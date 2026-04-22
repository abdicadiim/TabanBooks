import { useState, useEffect } from "react";
import { getToken, API_BASE_URL } from "../services/auth";
import { useAppBootstrap } from "../context/AppBootstrapContext";

export interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    isBase: boolean;
}

export interface BankAccountCurrency {
    code: string;
    name: string;
    symbol: string;
}

/**
 * Hook to fetch all currencies for bank account form
 * Returns currencies from /api/bankaccounts/currencies endpoint
 * Uses only currencies from the database
 */
export function useBankAccountCurrencies() {
    const [currencies, setCurrencies] = useState<BankAccountCurrency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCurrencies = async () => {
            const token = getToken();
            if (!token) {
                setError("No authentication token");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/bankaccounts/currencies`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to load currencies");
                }

                const data = await response.json();
                if (data.code === 0 && Array.isArray(data.currencies)) {
                    setCurrencies(data.currencies);
                } else {
                    setError("Invalid currency data format");
                    setCurrencies([]);
                }
            } catch (err: any) {
                console.error("Error fetching currencies:", err.message);
                setError(err.message);
                setCurrencies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrencies();
    }, []);

    return { currencies, loading, error };
}

export function useCurrency() {
    const { baseCurrency, loading: bootstrapLoading, authenticated } = useAppBootstrap();
    const loading = authenticated ? bootstrapLoading && !baseCurrency : false;
    const error = authenticated && !loading && !baseCurrency ? "Base currency not found" : null;

    const formatMoney = (amount: number | string) => {
        const val = typeof amount === "number" ? amount : Number(amount || 0);
        return `${baseCurrency?.symbol || ""}${val.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    return {
        baseCurrency,
        loading,
        error,
        symbol: baseCurrency?.symbol || "",
        code: baseCurrency?.code || "",
        baseCurrencyCode: baseCurrency?.code || "",
        formatMoney
    };
}
