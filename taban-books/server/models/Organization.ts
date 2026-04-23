/**
 * Organization Model
 * Company / Tenant (Multi-tenancy support)
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  organizationId?: string;
  name: string;
  legalName?: string;
  contactName?: string;
  email?: string;
  portalName?: string;
  timeZone?: string;
  languageCode?: string;
  dateFormat?: string;
  fieldSeparator?: string;
  industryType?: string;
  industrySize?: string;
  companyIdLabel?: string;
  companyIdValue?: string;
  fax?: string;
  taxInfo: {
    taxId?: string;
    taxName?: string;
  };
  currency: string;
  fiscalYearStart: Date;
  settings: {
    invoicePrefix: string;
    billPrefix: string;
    quotePrefix: string;
    enableMultiCurrency: boolean;
    enableInventory: boolean;
    enableProjects: boolean;
    enableLocations: boolean;
    enableExchangeRateFeeds: boolean;
    enablePANValidation?: boolean;
    retainerAccount?: string;
    enableProfitMargin?: boolean;
    modules?: Map<string, boolean>;
    itemsSettings?: {
      decimalPlaces: string;
      allowDuplicateNames: boolean;
      enableEnhancedSearch: boolean;
      enablePriceLists: boolean;
      enableInventoryTracking: boolean;
      inventoryStartDate: string;
      preventNegativeStock: boolean;
      showOutOfStockWarning: boolean;
      notifyReorderPoint: boolean;
      notifyReorderPointEmail: string;
      trackLandedCost: boolean;
      defaultFields: any[];
      customFields: any[];
      customButtons: any[];
      relatedLists: any[];
      recordLockConfigurations: any[];
    };
    quoteSettings?: {
      allowEditingAcceptedQuotes: boolean;
      allowCustomerAcceptDecline: boolean;
      automationOption: 'dont-convert' | 'draft-invoice' | 'send-invoice';
      allowProgressInvoice?: boolean;
      approvalType?: 'no-approval' | 'simple' | 'multi-level' | 'custom';
      hideZeroValueItems: boolean;
      retainFields: {
        customerNotes: boolean;
        termsConditions: boolean;
        address: boolean;
      };
      termsConditions: string;
      customerNotes: string;
      approvalLevels?: Array<{
        level: number;
        approver: string;
        email: string;
      }>;
      notificationPreference?: string;
      notificationEmail?: string;
      sendNotifications?: boolean;
      notifySubmitter?: boolean;
    };
    recurringInvoiceSettings?: {
      invoiceMode: "draft" | "sent";
      sendEmailToCustomer: boolean;
    };
    taxComplianceSettings?: {
      taxRegistrationLabel?: string;
      taxRegistrationNumber?: string;
      enableUseTaxInPurchases?: boolean;
      enableTDS?: boolean;
      tdsFor?: string;
      enableTDSOverride?: boolean;
      enableReverseChargeSales?: boolean;
      enableReverseChargePurchase?: boolean;
      taxTrackingAccount?: "single" | "separate";
      overrideTaxSales?: boolean;
      overrideTaxPurchases?: boolean;
      enableVATMOSS?: boolean;
      eoriNumber?: string;
      salesTaxDisabled?: boolean;
    };
    reportSettings?: {
      sendWeeklySummary?: boolean;
    };
    workflowNotificationPreferences?: {
      usageLimitThreshold?: number;
      usageLimitRecipients?: string[];
      failureLogFrequency?: string;
      failureLogTime?: string;
      failureLogRecipients?: string[];
      retryPolicy?: Record<string, any>;
    };
    emailNotificationPreferences?: {
      emailInsightsEnabled?: boolean;
      signature?: string;
    };
    emailRelay?: {
      servers?: Array<{
        id: string;
        serverName: string;
        port: number;
        dailyMailLimit: number;
        useSecureConnection: "SSL" | "TLS" | "Never";
        mailDeliveryPreference: "domain" | "email";
        domainInServer: string;
        authenticationRequired: boolean;
        username?: string;
        password?: string;
        isEnabled: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    };
    emailTemplates?: Record<string, any>;
    reportLayout?: {
      tableDensity?: string;
      tableDesign?: string;
      paperSize?: string;
      orientation?: string;
      fontFamily?: string;
      margins?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
      };
      details?: {
        showOrganizationName?: boolean;
        showReportBasis?: boolean;
        showPageNumber?: boolean;
        showGeneratedBy?: boolean;
        showGeneratedDate?: boolean;
        showGeneratedTime?: boolean;
      };
    };
  };
  subscription: {
    plan: string;
    status: string;
    expiresAt?: Date;
  };
  isActive: boolean;
  isVerified: boolean;
}

const organizationSchema = new Schema<IOrganization>(
  {
    organizationId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: () => `${Date.now()}${Math.floor(10000 + Math.random() * 90000)}`,
    },
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
      default: "",
    },
    contactName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    portalName: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    timeZone: {
      type: String,
      trim: true,
      default: "UTC",
    },
    languageCode: {
      type: String,
      trim: true,
      lowercase: true,
      default: "en",
    },
    dateFormat: {
      type: String,
      trim: true,
      default: "dd MMM yyyy",
    },
    fieldSeparator: {
      type: String,
      trim: true,
      default: " ",
    },
    industryType: {
      type: String,
      trim: true,
      default: "",
    },
    industrySize: {
      type: String,
      trim: true,
      default: "",
    },
    companyIdLabel: {
      type: String,
      trim: true,
      default: "Company ID",
    },
    companyIdValue: {
      type: String,
      trim: true,
      default: "",
    },
    fax: {
      type: String,
      trim: true,
      default: "",
    },
    taxInfo: {
      taxId: String,
      taxName: String,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    fiscalYearStart: {
      type: Date,
      default: () => new Date(new Date().getFullYear(), 0, 1), // January 1st
    },
    settings: {
      invoicePrefix: { type: String, default: "INV" },
      billPrefix: { type: String, default: "BILL" },
      quotePrefix: { type: String, default: "QUO" },
      enableMultiCurrency: { type: Boolean, default: false },
      enableInventory: { type: Boolean, default: true },
      enableProjects: { type: Boolean, default: true },
      enableLocations: { type: Boolean, default: false },
      enableExchangeRateFeeds: { type: Boolean, default: true },
      enablePANValidation: { type: Boolean, default: false },
      // New General Settings
      modules: {
        type: Map,
        of: Boolean,
        default: {
          quotes: true,
          salesOrders: false,
          salesReceipts: true,
          purchaseOrders: false,
          timeTracking: true,
          retainerInvoices: false,
          recurringInvoice: true,
          recurringExpense: true,
          recurringBills: true,
          recurringJournals: false,
          creditNote: true,
          debitNote: false,
          paymentLinks: false,
          tasks: false,
          selfBilledInvoice: false,
          fixedAsset: false
        }
      },
      workWeek: { type: String, default: "Sunday" },
      pdfSettings: {
        attachPDFInvoice: { type: Boolean, default: true },
        attachPaymentReceipt: { type: Boolean, default: false },
        encryptPDF: { type: Boolean, default: false },
      },
      discountSettings: {
        discountType: { type: String, default: "transaction" }, // none, line-item, transaction
        discountBeforeTax: { type: String, default: "Discount Before Tax" },
      },
      chargeSettings: {
        adjustments: { type: Boolean, default: true },
        shippingCharges: { type: Boolean, default: true },
        enableTaxAutomation: { type: Boolean, default: false },
        defaultTaxRate: { type: String, default: "Apply Default Tax Rate" },
      },
      taxSettings: {
        taxInclusive: { type: String, default: "inclusive" }, // inclusive, exclusive, both
        roundOffTax: { type: String, default: "line-item" }, // transaction, line-item
      },
      taxComplianceSettings: {
        taxRegistrationLabel: { type: String, default: "PIN" },
        taxRegistrationNumber: { type: String, default: "" },
        enableUseTaxInPurchases: { type: Boolean, default: false },
        enableTDS: { type: Boolean, default: false },
        tdsFor: { type: String, default: "Customers" },
        enableTDSOverride: { type: Boolean, default: false },
        enableReverseChargeSales: { type: Boolean, default: false },
        enableReverseChargePurchase: { type: Boolean, default: false },
        taxTrackingAccount: { type: String, enum: ["single", "separate"], default: "single" },
        overrideTaxSales: { type: Boolean, default: false },
        overrideTaxPurchases: { type: Boolean, default: false },
        enableVATMOSS: { type: Boolean, default: false },
        eoriNumber: { type: String, default: "" },
        salesTaxDisabled: { type: Boolean, default: false },
      },
      roundingSettings: {
        roundingOff: { type: String, default: "incremental" }, // no-rounding, whole-number, incremental
        roundingIncrement: { type: String, default: "0.05" },
      },
      salesSettings: {
        addSalespersonField: { type: Boolean, default: true },
        enableProfitMargin: { type: Boolean, default: false },
      },
      billingSettings: {
        billableAccount: { type: String, default: "" },
        defaultMarkup: { type: String, default: "3" },
        retainerAccount: { type: String, default: "Employee Reimbursements" },
      },
      documentSettings: {
        documentCopies: { type: Number, default: 2 },
        copyLabels: {
          original: { type: String, default: "ORIGINAL" },
          duplicate: { type: String, default: "DUPLICATE" },
          triplicate: { type: String, default: "TRIPLICATE" },
          quadruplicate: { type: String, default: "QUADRUPLICATE" },
          quintuplicate: { type: String, default: "QUINTUPLICATE" },
        }
      },
      printSettings: {
        printPreferences: { type: String, default: "choose-while-printing" },
      },
      reportLayout: {
        tableDensity: { type: String, default: "Classic" },
        tableDesign: { type: String, default: "Bordered" },
        paperSize: { type: String, default: "A4" },
        orientation: { type: String, default: "Portrait" },
        fontFamily: { type: String, default: "Open Sans" },
        margins: {
          top: { type: String, default: "0.7" },
          right: { type: String, default: "0.2" },
          bottom: { type: String, default: "0.7" },
          left: { type: String, default: "0.55" },
        },
        details: {
          showOrganizationName: { type: Boolean, default: true },
          showReportBasis: { type: Boolean, default: true },
          showPageNumber: { type: Boolean, default: true },
          showGeneratedBy: { type: Boolean, default: true },
          showGeneratedDate: { type: Boolean, default: true },
          showGeneratedTime: { type: Boolean, default: false },
        },
      },
      reportSettings: {
        sendWeeklySummary: { type: Boolean, default: false },
      },
      workflowNotificationPreferences: {
        type: Schema.Types.Mixed,
        default: {
          usageLimitThreshold: 80,
          usageLimitRecipients: [],
          failureLogFrequency: "daily",
          failureLogTime: "10:30",
          failureLogRecipients: [],
          retryPolicy: {},
        },
      },
      emailNotificationPreferences: {
        type: Schema.Types.Mixed,
        default: {
          emailInsightsEnabled: false,
          signature: "",
        },
      },
      emailRelay: {
        type: Schema.Types.Mixed,
        default: {
          servers: [],
        },
      },
      emailTemplates: {
        type: Schema.Types.Mixed,
        default: {},
      },
      retentionSettings: {
        paymentRetention: { type: Boolean, default: false },
      },
      pdfFormatSettings: {
        addressFormat: {
          type: String,
          default: '${ORGANIZATION.STREET_ADDRESS_1}\n${ORGANIZATION.STREET_ADDRESS_2}\n${ORGANIZATION.CITY} ${ORGANIZATION.STATE}\n${ORGANIZATION.POSTAL_CODE}\n${ORGANIZATION.COUNTRY}\n${ORGANIZATION.PHONE}\n${ORGANIZATION.EMAIL}\n${ORGANIZATION.WEBSITE}'
        },
      },
      itemsSettings: {
        decimalPlaces: { type: String, default: '2' },
        allowDuplicateNames: { type: Boolean, default: false },
        enableEnhancedSearch: { type: Boolean, default: false },
        enablePriceLists: { type: Boolean, default: false },
        enableInventoryTracking: { type: Boolean, default: true },
        inventoryStartDate: { type: String, default: '' },
        preventNegativeStock: { type: Boolean, default: true },
        showOutOfStockWarning: { type: Boolean, default: false },
        notifyReorderPoint: { type: Boolean, default: false },
        notifyReorderPointEmail: { type: String, default: '' },
        trackLandedCost: { type: Boolean, default: false },
        defaultFields: { type: Array, default: [] },
        customFields: { type: Array, default: [] },
        customButtons: { type: Array, default: [] },
        relatedLists: { type: Array, default: [] },
        recordLockConfigurations: { type: Array, default: [] },
      },
      quoteSettings: {
        allowEditingAcceptedQuotes: { type: Boolean, default: false },
        allowCustomerAcceptDecline: { type: Boolean, default: false },
        automationOption: { type: String, enum: ['dont-convert', 'draft-invoice', 'send-invoice'], default: 'dont-convert' },
        allowProgressInvoice: { type: Boolean, default: false },
        approvalType: { type: String, enum: ['no-approval', 'simple', 'multi-level', 'custom'], default: 'no-approval' },
        hideZeroValueItems: { type: Boolean, default: false },
        retainFields: {
          customerNotes: { type: Boolean, default: false },
          termsConditions: { type: Boolean, default: false },
          address: { type: Boolean, default: false },
        },
        termsConditions: { type: String, default: "" },
        customerNotes: { type: String, default: "Looking forward for your business." },
        approvalLevels: {
          type: [{
            level: Number,
            approver: String,
            email: String
          }],
          default: []
        },
        notificationPreference: { type: String, default: "all-submitters" },
        notificationEmail: { type: String, default: "" },
        sendNotifications: { type: Boolean, default: true },
        notifySubmitter: { type: Boolean, default: true },
      },
      recurringInvoiceSettings: {
        invoiceMode: { type: String, enum: ["draft", "sent"], default: "draft" },
        sendEmailToCustomer: { type: Boolean, default: false },
      },
      customersVendorsSettings: {
        allowDuplicates: { type: Boolean, default: true },
        enableCustomerNumbers: { type: Boolean, default: false },
        customerNumberPrefix: { type: String, default: 'CUS-' },
        customerNumberStart: { type: String, default: '0001' },
        enableVendorNumbers: { type: Boolean, default: false },
        vendorNumberPrefix: { type: String, default: 'VEN-' },
        vendorNumberStart: { type: String, default: '0001' },
        defaultCustomerType: { type: String, enum: ['business', 'individual'], default: 'business' },
        enableCreditLimit: { type: Boolean, default: false },
        creditLimitAction: { type: String, enum: ['restrict', 'warn'], default: 'warn' },
        includeSalesOrders: { type: Boolean, default: false },
        billingAddressFormat: {
          type: String,
          default: '${CONTACT.CONTACT_DISPLAYNAME}\n${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}'
        },
        shippingAddressFormat: {
          type: String,
          default: '${CONTACT.CONTACT_ADDRESS}\n${CONTACT.CONTACT_CITY}\n${CONTACT.CONTACT_CODE} ${CONTACT.CONTACT_STATE}\n${CONTACT.CONTACT_COUNTRY}'
        },
        customFields: { type: [mongoose.Schema.Types.Mixed], default: [] },
        customButtons: { type: [mongoose.Schema.Types.Mixed], default: [] },
        relatedLists: { type: [mongoose.Schema.Types.Mixed], default: [] },
      },
      accountantSettings: {
        chartOfAccounts: {
          makeAccountCodeMandatory: { type: Boolean, default: false },
          uniqueAccountCode: { type: Boolean, default: false },
        },
        currencyExchange: {
          trackingMethod: { type: String, enum: ['same', 'separate'], default: 'same' },
          sameAccount: { type: String, default: 'Exchange Gain or Loss' },
          gainAccount: { type: String, default: '' },
          lossAccount: { type: String, default: '' },
        },
        exchangeAdjustments: {
          defaultAccount: { type: String, default: 'Exchange Gain or Loss' },
        },
        journals: {
          allow13thMonthAdjustments: { type: Boolean, default: false },
        },
        journalApprovals: {
          approvalType: { type: String, enum: ['no-approval', 'simple-approval', 'multi-level-approval'], default: 'no-approval' },
        },
        defaultAccountTracking: {
          items: { type: mongoose.Schema.Types.Mixed, default: {} },
          customers: { type: mongoose.Schema.Types.Mixed, default: {} },
          vendors: { type: mongoose.Schema.Types.Mixed, default: {} },
          assets: { type: mongoose.Schema.Types.Mixed, default: {} },
          liabilities: { type: mongoose.Schema.Types.Mixed, default: {} },
          equity: { type: mongoose.Schema.Types.Mixed, default: {} },
          income: { type: mongoose.Schema.Types.Mixed, default: {} },
          expense: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        journalCustomFields: { type: Array, default: [] },
        chartCustomFields: { type: Array, default: [] },
      }
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "basic", "professional", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "suspended", "cancelled"],
        default: "active",
      },
      expiresAt: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
organizationSchema.index({ name: 1 });
organizationSchema.index({ portalName: 1 }, { sparse: true });

const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);

export default Organization;

