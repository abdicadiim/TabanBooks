/**
 * Recurring Expense Model
 * Recurring Expenses - Based on OpenAPI spec and Expense model
 */

import mongoose, { Document, Schema } from "mongoose";

export interface IRecurringExpenseLineItem {
    line_item_id?: string;
    account_id: mongoose.Types.ObjectId;
    description?: string;
    amount: number;
    tax_id?: mongoose.Types.ObjectId;
    item_order?: number;
    product_type?: string;
    acquisition_vat_id?: mongoose.Types.ObjectId;
    reverse_charge_vat_id?: mongoose.Types.ObjectId;
    reverse_charge_tax_id?: mongoose.Types.ObjectId;
    tax_exemption_code?: string;
    tax_exemption_id?: mongoose.Types.ObjectId;
    location_id?: mongoose.Types.ObjectId;
    hsn_or_sac?: string;
}

export interface IRecurringExpense extends Document {
    organization: mongoose.Types.ObjectId;
    recurring_expense_id?: string;

    // Profile settings
    profile_name: string;
    repeat_every: string; // "Week", "2 Weeks", "Month", etc.
    start_date: Date;
    end_date?: Date;
    never_expire: boolean;
    status: 'active' | 'stopped' | 'expired';
    last_created_date?: Date;
    next_expense_date?: Date;

    // Expense fields
    amount: number;
    account_id: mongoose.Types.ObjectId;
    paid_through_account_id: mongoose.Types.ObjectId;

    // Basic fields
    reference_number?: string; // Prefix usually
    description?: string;
    is_billable?: boolean;
    is_personal?: boolean;

    // References
    vendor_id?: mongoose.Types.ObjectId;
    customer_id?: mongoose.Types.ObjectId;
    project_id?: mongoose.Types.ObjectId;
    location_id?: mongoose.Types.ObjectId;
    currency_id?: mongoose.Types.ObjectId;

    // Tax fields
    tax_id?: mongoose.Types.ObjectId;
    tax_amount?: number;
    is_inclusive_tax?: boolean;
    line_items?: IRecurringExpenseLineItem[];
    taxes?: Array<{
        tax_id: mongoose.Types.ObjectId;
        tax_amount: number;
    }>;

    // GST/Tax treatment fields (India)
    source_of_supply?: string;
    destination_of_supply?: string;
    destination_of_supply_state?: string;
    place_of_supply?: string;
    hsn_or_sac?: string;
    gst_no?: string;
    gst_treatment?: string;
    tax_treatment?: string;
    reverse_charge_tax_id?: mongoose.Types.ObjectId;
    reverse_charge_tax_name?: string;
    reverse_charge_tax_percentage?: number;
    reverse_charge_tax_amount?: number;
    reverse_charge_vat_total?: number;
    reverse_charge_vat_summary?: Array<{ tax: { tax_name: string; tax_amount: number } }>;
    is_itemized_expense?: boolean;
    is_pre_gst?: boolean;

    // VAT fields (GCC/UK)
    vat_reg_no?: string;
    vat_treatment?: string;
    acquisition_vat_total?: number;
    acquisition_vat_summary?: Array<{ tax: { tax_name: string; tax_amount: number } }>;

    // Currency
    currency_code?: string;
    exchange_rate?: number;
    sub_total?: number;
    total?: number;
    total_without_tax?: number;
    bcy_total?: number;
    bcy_total_without_tax?: number;

    // Mileage fields
    mileage_type?: 'non_mileage' | 'manual' | 'odometer';
    mileage_rate?: number;
    mileage_unit?: 'km' | 'mile';
    start_reading?: number;
    end_reading?: number;
    distance?: string;
    expense_type?: 'non-mileage' | 'mileage';
    employee_id?: mongoose.Types.ObjectId;
    vehicle_type?: 'car' | 'van' | 'motorcycle' | 'bike';
    can_reclaim_vat_on_mileage?: string;
    fuel_type?: 'petrol' | 'lpg' | 'diesel';
    engine_capacity_range?: 'less_than_1400cc' | 'between_1400cc_and_1600cc' | 'between_1600cc_and_2000cc' | 'more_than_2000cc';

    // Product type (UK/SouthAfrica)
    product_type?: 'digital_service' | 'goods' | 'service' | 'capital_service' | 'capital_goods';

    // Custom fields
    custom_fields?: any[];
    comments?: Array<{
        text?: string;
        author?: string;
        createdAt?: Date;
    }>;
    attachments?: Array<{
        id?: string;
        name?: string;
        url?: string;
        size?: number;
        type?: string;
        uploadedAt?: Date;
    }>;

    // Account and vendor names (populated)
    account_name?: string;
    paid_through_account_name?: string;
    customer_name?: string;
    vendor_name?: string;
    project_name?: string;
    location_name?: string;
    tax_name?: string;
    tax_percentage?: number;

    // Timestamps
    created_time?: Date;
    last_modified_time?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const recurringExpenseLineItemSchema = new Schema<IRecurringExpenseLineItem>({
    account_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChartOfAccount",
        required: true,
    },
    description: String,
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    tax_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tax",
    },
    item_order: Number,
    product_type: String,
    acquisition_vat_id: mongoose.Schema.Types.ObjectId,
    reverse_charge_vat_id: mongoose.Schema.Types.ObjectId,
    reverse_charge_tax_id: mongoose.Schema.Types.ObjectId,
    tax_exemption_code: String,
    tax_exemption_id: mongoose.Schema.Types.ObjectId,
    location_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
    },
    hsn_or_sac: String,
}, { _id: false });

const recurringExpenseSchema = new Schema<IRecurringExpense>(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        recurring_expense_id: String,

        // Profile setings
        profile_name: { type: String, required: true },
        repeat_every: { type: String, required: true },
        start_date: { type: Date, required: true },
        end_date: Date,
        never_expire: { type: Boolean, default: true },
        status: {
            type: String,
            enum: ['active', 'stopped', 'expired'],
            default: 'active'
        },
        last_created_date: Date,
        next_expense_date: Date,

        // Expense fields
        account_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChartOfAccount",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        paid_through_account_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BankAccount",
            required: true,
        },

        // Basic fields
        reference_number: String,
        description: String,
        is_billable: { type: Boolean, default: false },
        is_personal: { type: Boolean, default: false },

        // References
        vendor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
        },
        customer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
        },
        project_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
        },
        location_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Location",
        },
        currency_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Currency",
        },

        // Tax fields
        tax_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tax",
        },
        tax_amount: { type: Number, default: 0 },
        is_inclusive_tax: { type: Boolean, default: true },
        line_items: [recurringExpenseLineItemSchema],
        taxes: [{
            tax_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tax" },
            tax_amount: Number,
        }],

        // GST/Tax treatment fields
        source_of_supply: String,
        destination_of_supply: String,
        destination_of_supply_state: String,
        place_of_supply: String,
        hsn_or_sac: String,
        gst_no: String,
        gst_treatment: String,
        tax_treatment: String,
        reverse_charge_tax_id: mongoose.Schema.Types.ObjectId,
        reverse_charge_tax_name: String,
        reverse_charge_tax_percentage: Number,
        reverse_charge_tax_amount: Number,
        reverse_charge_vat_total: Number,
        reverse_charge_vat_summary: [{
            tax: {
                tax_name: String,
                tax_amount: Number,
            },
        }],
        is_itemized_expense: { type: Boolean, default: false },
        is_pre_gst: String,

        // VAT fields
        vat_reg_no: String,
        vat_treatment: String,
        acquisition_vat_total: Number,
        acquisition_vat_summary: [{
            tax: {
                tax_name: String,
                tax_amount: Number,
            },
        }],

        // Currency
        currency_code: { type: String, default: "USD", uppercase: true },
        exchange_rate: { type: Number, default: 1 },
        sub_total: Number,
        total: Number,
        total_without_tax: Number,
        bcy_total: Number,
        bcy_total_without_tax: Number,

        // Mileage fields
        mileage_type: {
            type: String,
            enum: ["non_mileage", "manual", "odometer"],
            default: "non_mileage",
        },
        mileage_rate: Number,
        mileage_unit: {
            type: String,
            enum: ["km", "mile"],
        },
        start_reading: Number,
        end_reading: Number,
        distance: String,
        expense_type: {
            type: String,
            enum: ["non-mileage", "mileage"],
            default: "non-mileage",
        },
        employee_id: mongoose.Schema.Types.ObjectId,
        vehicle_type: {
            type: String,
            enum: ["car", "van", "motorcycle", "bike"],
        },
        can_reclaim_vat_on_mileage: String,
        fuel_type: {
            type: String,
            enum: ["petrol", "lpg", "diesel"],
        },
        engine_capacity_range: {
            type: String,
            enum: ["less_than_1400cc", "between_1400cc_and_1600cc", "between_1600cc_and_2000cc", "more_than_2000cc"],
        },

        // Product type
        product_type: {
            type: String,
            enum: ["digital_service", "goods", "service", "capital_service", "capital_goods"],
        },

        // Custom fields
        custom_fields: [Schema.Types.Mixed],
        comments: [{
            text: { type: String, trim: true },
            author: { type: String, trim: true },
            createdAt: { type: Date, default: Date.now },
        }],
        attachments: [{
            id: String,
            name: String,
            url: String,
            size: Number,
            type: String,
            uploadedAt: { type: Date, default: Date.now },
        }],

        // Populated fields (not stored)
        account_name: String,
        paid_through_account_name: String,
        customer_name: String,
        vendor_name: String,
        project_name: String,
        location_name: String,
        tax_name: String,
        tax_percentage: Number,

        // Timestamps
        created_time: Date,
        last_modified_time: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Pre-save middleware
recurringExpenseSchema.pre('save', function (next) {
    if (!this.recurring_expense_id) {
        this.recurring_expense_id = this._id.toString();
    }
    if (!this.created_time) {
        this.created_time = this.createdAt || new Date();
    }
    this.last_modified_time = this.updatedAt || new Date();

    // Calculate next expense date if not set (or update it) - Logic can be complex, simplifying for now
    if (!this.next_expense_date && this.start_date) {
        this.next_expense_date = this.start_date;
    }

    // Calculate totals if not provided
    if (this.amount !== undefined && this.sub_total === undefined) {
        const taxAmount = this.tax_amount || 0;
        if (this.is_inclusive_tax) {
            // If tax is inclusive, amount already includes tax
            this.sub_total = this.amount - taxAmount;
            this.total = this.amount;
            this.total_without_tax = this.sub_total;
        } else {
            // If tax is exclusive, amount is the base amount
            this.sub_total = this.amount;
            this.total = this.amount + taxAmount;
            this.total_without_tax = this.amount;
        }
        this.bcy_total = this.total;
        this.bcy_total_without_tax = this.total_without_tax;
    }

    next();
});

// Indexes
recurringExpenseSchema.index({ organization: 1, start_date: 1 });
recurringExpenseSchema.index({ organization: 1, next_expense_date: 1 });
recurringExpenseSchema.index({ organization: 1, status: 1 });
recurringExpenseSchema.index({ organization: 1, profile_name: 1 });
recurringExpenseSchema.index({ organization: 1, vendor_id: 1 });
recurringExpenseSchema.index({ organization: 1, created_time: 1 });

const RecurringExpense = mongoose.model<IRecurringExpense>("RecurringExpense", recurringExpenseSchema);

export default RecurringExpense;
