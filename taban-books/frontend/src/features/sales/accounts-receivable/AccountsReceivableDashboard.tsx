import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../../../services/dashboardService";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  CreditCard,
  Eye,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  customerName: string;
  type: string;
  debit: number;
  credit: number;
}

export default function AccountsReceivableDashboard() {
  const navigate = useNavigate();
  const [arBalance, setArBalance] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [overdueInvoices, setOverdueInvoices] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAccountsReceivableData = async () => {
    try {
      setIsLoading(prev => (recentTransactions.length === 0 ? true : prev));
      const response = await dashboardService.getAccountsReceivableSummary();

      if (response && response.success && response.data) {
        setArBalance(response.data.balance || 0);
        setTotalInvoices(response.data.count || 0);
        setOverdueInvoices(response.data.overdueCount || 0);
        setRecentTransactions(response.data.recentTransactions || []);
      }
    } catch (error) {
      console.error('Error loading Accounts Receivable data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Accounts Receivable data from dashboard service
  useEffect(() => {
    loadAccountsReceivableData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAccountsReceivableData();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBalanceType = () => {
    return arBalance >= 0 ? 'Dr' : 'Cr';
  };

  const getBalanceColor = () => {
    return arBalance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getBalanceBgColor = () => {
    return arBalance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accounts Receivable</h1>
              <p className="text-sm text-gray-500">Control account dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <AlertTriangle size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => navigate('/sales/accounts-receivable/ledger')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FileText size={16} />
                View Ledger
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="px-6 py-6">
        <div className={`bg-white rounded-lg border-2 p-8 ${getBalanceBgColor()}`}>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 mb-2">Accounts Receivable Balance</p>
            <p className={`text-5xl font-bold ${getBalanceColor()} mb-4`}>
              {formatCurrency(Math.abs(arBalance))} {getBalanceType()}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {arBalance >= 0 ? (
                  <TrendingDown className="text-green-600" size={20} />
                ) : (
                  <TrendingUp className="text-red-600" size={20} />
                )}
                <span className="text-gray-600">
                  {arBalance >= 0 ? 'Customers owe you' : 'You owe customers'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Invoices Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalInvoices}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* Overdue Invoices Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                <p className="text-2xl font-bold text-red-600">
                  {overdueInvoices}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
            </div>
          </div>

          {/* Recent Transactions Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentTransactions.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <button
                onClick={() => navigate('/sales/accounts-receivable/ledger')}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading transactions...</span>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent transactions</h3>
              <p className="text-gray-500">
                No Accounts Receivable transactions have been recorded yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${transaction.type === 'Invoice'
                            ? 'bg-blue-100 text-blue-800'
                            : transaction.type === 'Payment'
                              ? 'bg-green-100 text-green-800'
                              : transaction.type === 'Credit Note'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={transaction.debit > 0 ? 'text-gray-900' : 'text-green-600'}>
                          {formatCurrency(transaction.debit || transaction.credit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
