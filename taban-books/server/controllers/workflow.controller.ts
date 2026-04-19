/**
 * Workflow Controller
 * Handles workflow rules, actions, and logs
 */
import WorkflowRule from "../models/WorkflowRule.js";
import WorkflowLog from "../models/WorkflowLog.js";
import WorkflowAction from "../models/WorkflowAction.js";
import WorkflowSchedule from "../models/WorkflowSchedule.js";
import Organization from "../models/Organization.js";
const parseBoolean = (value) => {
    if (value === undefined || value === null || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(normalized))
        return true;
    if (["false", "0", "no", "inactive"].includes(normalized))
        return false;
    return undefined;
};
const mapActionTypeToEvent = (actionType) => {
    const normalized = String(actionType || "").trim().toLowerCase();
    if (normalized === "edited")
        return "on_update";
    if (normalized === "created or edited")
        return "on_create_or_update";
    if (normalized === "deleted")
        return "on_delete";
    return "on_create";
};
const DEFAULT_WORKFLOW_NOTIFICATION_PREFERENCES = {
    usageLimitThreshold: 80,
    usageLimitRecipients: [],
    failureLogFrequency: "daily",
    failureLogTime: "10:30",
    failureLogRecipients: [],
    retryPolicy: {},
    channels: {},
};
const normalizeWorkflowType = (workflowType) => {
    const normalized = String(workflowType || "").trim().toLowerCase();
    if (normalized === "date based" || normalized === "date_based")
        return "date_based";
    return "event_based";
};
const normalizeArrayOfStrings = (value) => {
    if (!Array.isArray(value))
        return [];
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
};
const normalizeCriteria = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => ({
        field: String(entry?.field || "").trim(),
        operator: String(entry?.operator || "").trim(),
        value: entry?.value,
        joinWith: String(entry?.joinWith || "").toUpperCase() === "OR"
            ? "OR"
            : String(entry?.joinWith || "").toUpperCase() === "AND"
                ? "AND"
                : undefined,
    }))
        .filter((entry) => entry.field && entry.operator);
};
const normalizeLegacyActions = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => ({
        type: String(entry?.type || "").trim(),
        config: entry?.config ?? {},
    }))
        .filter((entry) => Boolean(entry.type));
};
const normalizeImmediateActions = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => ({
        actionId: entry?.actionId,
        type: entry?.type ? String(entry.type).trim() : undefined,
        name: entry?.name ? String(entry.name).trim() : undefined,
        config: entry?.config ?? {},
    }))
        .filter((entry) => Boolean(entry.actionId || entry.type || entry.name));
};
const normalizeTimeBasedActions = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => {
        const relation = String(entry?.executionTime?.relation || "").toLowerCase();
        const normalizedRelation = ["before", "after", "on"].includes(relation)
            ? relation
            : undefined;
        const offsetDays = Number(entry?.executionTime?.offsetDays);
        return {
            executionTime: {
                offsetDays: Number.isFinite(offsetDays) ? offsetDays : undefined,
                relation: normalizedRelation,
                dateField: entry?.executionTime?.dateField
                    ? String(entry.executionTime.dateField).trim()
                    : undefined,
                time: entry?.executionTime?.time ? String(entry.executionTime.time).trim() : undefined,
                frequency: entry?.executionTime?.frequency
                    ? String(entry.executionTime.frequency).trim()
                    : undefined,
            },
            actions: normalizeImmediateActions(entry?.actions),
        };
    })
        .filter((entry) => entry.actions.length > 0);
};
const parseLimit = (value, fallback = 50) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return Math.min(parsed, 500);
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBHOOK_ALLOWED_METHODS = ["POST", "PUT", "DELETE"];
const SCHEDULE_ALLOWED_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const normalizeRecipientList = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
    }
    return [];
};
const normalizeEmailList = (value) => normalizeRecipientList(value).filter((email) => EMAIL_REGEX.test(email));
const normalizeKeyValuePairs = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => ({
        key: String(entry?.key || "").trim(),
        value: String(entry?.value || "").trim(),
    }))
        .filter((entry) => entry.key.length > 0);
};
const validateWebhookUrl = (value) => {
    let url;
    try {
        url = new URL(String(value || "").trim());
    }
    catch (_error) {
        return false;
    }
    if (!["http:", "https:"].includes(url.protocol))
        return false;
    if (url.port && !["80", "443"].includes(url.port))
        return false;
    return true;
};
const normalizeWorkflowActionConfig = (type, rawConfig) => {
    const config = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    const normalizedType = String(type || "").trim();
    if (!normalizedType) {
        throw new Error("Workflow action type is required");
    }
    if (normalizedType === "email_alert") {
        const emailTemplate = String(config.emailTemplate || "").trim();
        const emailRecipients = normalizeRecipientList(config.emailRecipients || config.recipients);
        const additionalRecipients = normalizeEmailList(config.additionalRecipients || config.additionalEmails);
        if (!emailTemplate) {
            throw new Error("Email template is required for email alerts");
        }
        if (!emailRecipients.length) {
            throw new Error("At least one recipient is required for email alerts");
        }
        if (additionalRecipients.length > 10) {
            throw new Error("You can add a maximum of 10 additional recipients");
        }
        return {
            from: String(config.from || "").trim(),
            emailTemplate,
            emailRecipients,
            additionalRecipients,
            cc: normalizeEmailList(config.cc),
            bcc: normalizeEmailList(config.bcc),
            attachPDF: Boolean(config.attachPDF),
        };
    }
    if (normalizedType === "in_app_notification") {
        const recipients = normalizeRecipientList(config.recipients || config.recipientRoles || config.users);
        const message = String(config.message || "").trim();
        if (!recipients.length) {
            throw new Error("Recipients are required for in-app notifications");
        }
        if (!message) {
            throw new Error("Message is required for in-app notifications");
        }
        return {
            recipients,
            message,
            sendPush: Boolean(config.sendPush),
        };
    }
    if (normalizedType === "field_update") {
        const fieldToUpdate = String(config.fieldToUpdate || config.update || "").trim();
        const updateWithEmptyValue = Boolean(config.updateWithEmptyValue);
        const newValue = config.newValue ?? config.value ?? "";
        if (!fieldToUpdate) {
            throw new Error("Field to update is required");
        }
        if (!updateWithEmptyValue && String(newValue).trim() === "") {
            throw new Error("New value is required unless update with empty value is enabled");
        }
        return {
            fieldToUpdate,
            updateWithEmptyValue,
            newValue: updateWithEmptyValue ? "" : newValue,
        };
    }
    if (normalizedType === "webhook") {
        const method = String(config.method || "POST").trim().toUpperCase();
        const url = String(config.url || config.endpoint || "").trim();
        const secureWebhook = Boolean(config.secureWebhook || config.secure || config.useSecretToken);
        const secretToken = String(config.secretToken || "").trim();
        if (!WEBHOOK_ALLOWED_METHODS.includes(method)) {
            throw new Error("Webhook method must be POST, PUT, or DELETE");
        }
        if (!url) {
            throw new Error("Webhook URL is required");
        }
        if (!validateWebhookUrl(url)) {
            throw new Error("Webhook URL must be HTTP/HTTPS and only port 80 or 443 is supported");
        }
        if (secureWebhook && !/^[a-zA-Z0-9]{12,50}$/.test(secretToken)) {
            throw new Error("Secret token must be alphanumeric and contain 12 to 50 characters");
        }
        return {
            method,
            url,
            parameters: normalizeKeyValuePairs(config.parameters),
            headers: normalizeKeyValuePairs(config.headers),
            authorizationType: String(config.authorizationType || "self").toLowerCase() === "connections"
                ? "connections"
                : "self",
            bodyType: String(config.bodyType || "default_payload").toLowerCase(),
            body: config.body ?? "",
            secureWebhook,
            secretToken: secureWebhook ? secretToken : "",
            description: String(config.description || "").trim(),
        };
    }
    if (normalizedType === "custom_function") {
        const language = String(config.language || "deluge").trim().toLowerCase();
        const code = String(config.code || "").trim();
        if (!code) {
            throw new Error("Custom function code is required");
        }
        return {
            language,
            code,
            description: String(config.description || "").trim(),
        };
    }
    return config;
};
const normalizeSchedulePayload = (payload) => {
    const normalizedFrequency = String(payload?.frequency || payload?.scheduleType || "daily")
        .trim()
        .toLowerCase();
    const frequency = SCHEDULE_ALLOWED_FREQUENCIES.includes(normalizedFrequency)
        ? normalizedFrequency
        : "daily";
    const days = normalizeArrayOfStrings(payload?.days);
    const dayOfMonthRaw = Number(payload?.dayOfMonth);
    const monthOfYearRaw = Number(payload?.monthOfYear);
    const startDate = payload?.startDate ? new Date(payload.startDate) : undefined;
    const endDate = payload?.endDate ? new Date(payload.endDate) : undefined;
    const time = String(payload?.time || "").trim();
    return {
        name: String(payload?.name || "").trim(),
        module: String(payload?.module || "").trim(),
        frequency,
        time,
        days,
        dayOfMonth: Number.isFinite(dayOfMonthRaw) && dayOfMonthRaw >= 1 && dayOfMonthRaw <= 31
            ? dayOfMonthRaw
            : undefined,
        monthOfYear: Number.isFinite(monthOfYearRaw) && monthOfYearRaw >= 1 && monthOfYearRaw <= 12
            ? monthOfYearRaw
            : undefined,
        startDate,
        endDate,
        functionCode: payload?.functionCode ? String(payload.functionCode) : "",
        metadata: payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    };
};
const normalizeRulePayload = (payload) => {
    const workflowType = normalizeWorkflowType(payload?.workflowType);
    const actionType = payload?.actionType ? String(payload.actionType).trim() : undefined;
    const criteria = normalizeCriteria(payload?.criteria);
    const trigger = payload?.trigger && typeof payload.trigger === "object"
        ? {
            event: String(payload.trigger.event || "").trim() || mapActionTypeToEvent(actionType),
            conditions: normalizeCriteria(payload.trigger.conditions),
        }
        : {
            event: workflowType === "date_based" ? "date_based" : mapActionTypeToEvent(actionType),
            conditions: criteria.map(({ field, operator, value }) => ({ field, operator, value })),
        };
    return {
        name: payload?.name ? String(payload.name).trim() : undefined,
        module: payload?.module ? String(payload.module).trim() : undefined,
        description: payload?.description !== undefined ? String(payload.description || "").trim() : undefined,
        workflowType,
        actionType,
        executeWhen: payload?.executeWhen !== undefined ? String(payload.executeWhen || "").trim() : undefined,
        recordEditType: payload?.recordEditType !== undefined
            ? String(payload.recordEditType || "").trim()
            : undefined,
        selectedFields: normalizeArrayOfStrings(payload?.selectedFields),
        criteria,
        criteriaPattern: payload?.criteriaPattern !== undefined ? String(payload.criteriaPattern || "").trim() : undefined,
        immediateActions: normalizeImmediateActions(payload?.immediateActions),
        timeBasedActions: normalizeTimeBasedActions(payload?.timeBasedActions),
        trigger,
        actions: normalizeLegacyActions(payload?.actions),
        executionOrder: payload?.executionOrder !== undefined && Number.isFinite(Number(payload.executionOrder))
            ? Number(payload.executionOrder)
            : undefined,
        isActive: payload?.isActive !== undefined ? Boolean(parseBoolean(payload.isActive)) : undefined,
    };
};
/**
 * Get all workflow rules
 * GET /api/settings/workflow-rules
 */
export const getWorkflowRules = async (req, res) => {
    try {
        const { module, status } = req.query;
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const query: any = {
            organization: orgId,
        };
        if (module && module !== "All") {
            query.module = module;
        }
        const isActive = parseBoolean(status);
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
        const rules = await WorkflowRule.find(query).sort({ executionOrder: 1, createdAt: -1 });
        res.json({
            success: true,
            data: rules,
        });
    }
    catch (error) {
        console.error("Error fetching workflow rules:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow rules",
        });
    }
};
/**
 * Get single workflow rule
 * GET /api/settings/workflow-rules/:id
 */
export const getWorkflowRule = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const rule = await WorkflowRule.findOne({
            _id: id,
            organization: orgId,
        });
        if (!rule) {
            res.status(404).json({
                success: false,
                message: "Workflow rule not found",
            });
            return;
        }
        res.json({
            success: true,
            data: rule,
        });
    }
    catch (error) {
        console.error("Error fetching workflow rule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow rule",
        });
    }
};
/**
 * Create workflow rule
 * POST /api/settings/workflow-rules
 */
export const createWorkflowRule = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const payload = normalizeRulePayload(req.body || {});
        if (!payload.name || !payload.module) {
            res.status(400).json({
                success: false,
                message: "Name and module are required",
            });
            return;
        }
        const maxOrderRule = await WorkflowRule.findOne({ organization: orgId, module: payload.module })
            .sort({ executionOrder: -1 })
            .select("executionOrder");
        const rule = await WorkflowRule.create({
            organization: orgId,
            name: payload.name,
            module: payload.module,
            description: payload.description,
            workflowType: payload.workflowType as any,
            actionType: payload.actionType,
            executeWhen: payload.executeWhen,
            recordEditType: payload.recordEditType,
            selectedFields: payload.selectedFields,
            criteria: payload.criteria as any,
            criteriaPattern: payload.criteriaPattern || "",
            immediateActions: payload.immediateActions,
            timeBasedActions: payload.timeBasedActions as any,
            trigger: payload.trigger,
            actions: payload.actions,
            executionOrder: payload.executionOrder !== undefined
                ? payload.executionOrder
                : (maxOrderRule?.executionOrder ?? -1) + 1,
            isActive: payload.isActive === undefined ? true : payload.isActive,
        });
        res.status(201).json({
            success: true,
            message: "Workflow rule created successfully",
            data: rule,
        });
    }
    catch (error) {
        console.error("Error creating workflow rule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create workflow rule",
        });
    }
};
/**
 * Update workflow rule
 * PUT /api/settings/workflow-rules/:id
 */
export const updateWorkflowRule = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const rule = await WorkflowRule.findOne({
            _id: id,
            organization: orgId,
        });
        if (!rule) {
            res.status(404).json({
                success: false,
                message: "Workflow rule not found",
            });
            return;
        }
        const payload = normalizeRulePayload(req.body || {});
        if (payload.name !== undefined)
            rule.name = payload.name;
        if (payload.module !== undefined)
            rule.module = payload.module;
        if (payload.description !== undefined)
            rule.description = payload.description;
        if (payload.workflowType !== undefined)
            rule.workflowType = payload.workflowType as any;
        if (payload.actionType !== undefined)
            rule.actionType = payload.actionType;
        if (payload.executeWhen !== undefined)
            rule.executeWhen = payload.executeWhen;
        if (payload.recordEditType !== undefined)
            rule.recordEditType = payload.recordEditType;
        if (req.body?.selectedFields !== undefined)
            rule.selectedFields = payload.selectedFields;
        if (req.body?.criteria !== undefined)
            rule.criteria = payload.criteria as any;
        if (payload.criteriaPattern !== undefined)
            rule.criteriaPattern = payload.criteriaPattern;
        if (req.body?.immediateActions !== undefined)
            rule.immediateActions = payload.immediateActions;
        if (req.body?.timeBasedActions !== undefined)
            rule.timeBasedActions = payload.timeBasedActions as any;
        if (req.body?.trigger !== undefined || req.body?.actionType !== undefined)
            rule.trigger = payload.trigger;
        if (req.body?.actions !== undefined)
            rule.actions = payload.actions;
        if (payload.isActive !== undefined)
            rule.isActive = payload.isActive;
        if (payload.executionOrder !== undefined)
            rule.executionOrder = payload.executionOrder;
        await rule.save();
        res.json({
            success: true,
            message: "Workflow rule updated successfully",
            data: rule,
        });
    }
    catch (error) {
        console.error("Error updating workflow rule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update workflow rule",
        });
    }
};
/**
 * Clone workflow rule
 * POST /api/settings/workflow-rules/:id/clone
 */
export const cloneWorkflowRule = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const rule = await WorkflowRule.findOne({ _id: id, organization: orgId });
        if (!rule) {
            res.status(404).json({
                success: false,
                message: "Workflow rule not found",
            });
            return;
        }
        const escapedName = rule.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const existingCloneCount = await WorkflowRule.countDocuments({
            organization: orgId,
            module: rule.module,
            name: new RegExp(`^${escapedName} \\(Clone`, "i"),
        });
        const maxOrderRule = await WorkflowRule.findOne({ organization: orgId, module: rule.module })
            .sort({ executionOrder: -1 })
            .select("executionOrder");
        const cloneData: any = rule.toObject();
        delete cloneData._id;
        delete cloneData.createdAt;
        delete cloneData.updatedAt;
        delete cloneData.__v;
        cloneData.name = existingCloneCount > 0
            ? `${rule.name} (Clone ${existingCloneCount + 1})`
            : `${rule.name} (Clone)`;
        cloneData.isActive = false;
        cloneData.executionOrder = (maxOrderRule?.executionOrder ?? -1) + 1;
        const clonedRule = await WorkflowRule.create(cloneData);
        res.status(201).json({
            success: true,
            message: "Workflow rule cloned successfully",
            data: clonedRule,
        });
    }
    catch (error) {
        console.error("Error cloning workflow rule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to clone workflow rule",
        });
    }
};
/**
 * Reorder workflow rules
 * PUT /api/settings/workflow-rules/reorder
 */
export const reorderWorkflowRules = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { order, rules } = req.body || {};
        const updates = [];
        if (Array.isArray(order)) {
            order.forEach((id, index) => {
                if (id) {
                    updates.push({ id: String(id), executionOrder: index });
                }
            });
        }
        else if (Array.isArray(rules)) {
            rules.forEach((item, index) => {
                const id = item?.id || item?._id;
                if (!id)
                    return;
                const rawOrder = Number(item?.executionOrder);
                updates.push({
                    id: String(id),
                    executionOrder: Number.isFinite(rawOrder) ? rawOrder : index,
                });
            });
        }
        if (!updates.length) {
            res.status(400).json({
                success: false,
                message: "At least one workflow rule order update is required",
            });
            return;
        }
        const ids = updates.map((item) => item.id);
        const existingCount = await WorkflowRule.countDocuments({
            _id: { $in: ids },
            organization: orgId,
        });
        if (existingCount !== ids.length) {
            res.status(400).json({
                success: false,
                message: "One or more workflow rules are invalid for this organization",
            });
            return;
        }
        await WorkflowRule.bulkWrite(updates.map((item) => ({
            updateOne: {
                filter: { _id: item.id, organization: orgId },
                update: { $set: { executionOrder: item.executionOrder } },
            },
        })));
        res.json({
            success: true,
            message: "Workflow rules reordered successfully",
        });
    }
    catch (error) {
        console.error("Error reordering workflow rules:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to reorder workflow rules",
        });
    }
};
/**
 * Get workflow notification preferences
 * GET /api/settings/workflow-rules/notification-preferences
 */
export const getWorkflowNotificationPreferences = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const org = await Organization.findById(orgId).select("settings.workflowNotificationPreferences");
        if (!org) {
            res.status(404).json({ success: false, message: "Organization not found" });
            return;
        }
        const preferences = {
            ...DEFAULT_WORKFLOW_NOTIFICATION_PREFERENCES,
            ...(org.settings?.workflowNotificationPreferences || {}),
        };
        res.json({
            success: true,
            data: preferences,
        });
    }
    catch (error) {
        console.error("Error fetching workflow notification preferences:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow notification preferences",
        });
    }
};
/**
 * Update workflow notification preferences
 * PUT /api/settings/workflow-rules/notification-preferences
 */
export const updateWorkflowNotificationPreferences = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const org = await Organization.findById(orgId);
        if (!org) {
            res.status(404).json({ success: false, message: "Organization not found" });
            return;
        }
        const current = {
            ...DEFAULT_WORKFLOW_NOTIFICATION_PREFERENCES,
            ...(org.settings?.workflowNotificationPreferences || {}),
        };
        const payload = req.body || {};
        const usageLimitThreshold = Number(payload.usageLimitThreshold);
        const normalizedFrequency = String(payload.failureLogFrequency || payload.frequency || "")
            .trim()
            .toLowerCase();
        const normalizedTime = String(payload.failureLogTime || payload.time || "").trim();
        const updatedPreferences = {
            ...current,
            usageLimitThreshold: Number.isFinite(usageLimitThreshold) && usageLimitThreshold > 0
                ? Math.min(usageLimitThreshold, 100000)
                : current.usageLimitThreshold,
            usageLimitRecipients: payload.usageLimitRecipients
                ? normalizeArrayOfStrings(payload.usageLimitRecipients)
                : current.usageLimitRecipients,
            failureLogFrequency: ["hourly", "daily", "weekly", "monthly"].includes(normalizedFrequency)
                ? normalizedFrequency
                : current.failureLogFrequency,
            failureLogTime: /^\d{2}:\d{2}$/.test(normalizedTime) ? normalizedTime : current.failureLogTime,
            failureLogRecipients: payload.failureLogRecipients
                ? normalizeArrayOfStrings(payload.failureLogRecipients)
                : payload.recipients
                    ? normalizeArrayOfStrings(payload.recipients)
                    : current.failureLogRecipients,
            retryPolicy: payload.retryPolicy && typeof payload.retryPolicy === "object"
                ? payload.retryPolicy
                : current.retryPolicy,
            channels: {
                ...(current.channels || {}),
            },
        };
        if (payload.activeTab) {
            const channelKey = String(payload.activeTab || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_");
            if (channelKey) {
                updatedPreferences.channels[channelKey] = {
                    frequency: payload.frequency || payload.failureLogFrequency || current.failureLogFrequency,
                    time: payload.time || payload.failureLogTime || current.failureLogTime,
                    recipients: normalizeArrayOfStrings(payload.recipients || payload.failureLogRecipients),
                    retryPolicy: payload.retryPolicy && typeof payload.retryPolicy === "object"
                        ? payload.retryPolicy
                        : current.retryPolicy,
                };
            }
        }
        const orgSettings: any = org.settings || {};
        orgSettings.workflowNotificationPreferences = updatedPreferences;
        org.settings = orgSettings;
        await org.save();
        res.json({
            success: true,
            message: "Workflow notification preferences updated successfully",
            data: updatedPreferences,
        });
    }
    catch (error) {
        console.error("Error updating workflow notification preferences:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update workflow notification preferences",
        });
    }
};
/**
 * Delete workflow rule
 * DELETE /api/settings/workflow-rules/:id
 */
export const deleteWorkflowRule = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const rule = await WorkflowRule.findOne({
            _id: id,
            organization: orgId,
        });
        if (!rule) {
            res.status(404).json({
                success: false,
                message: "Workflow rule not found",
            });
            return;
        }
        await WorkflowRule.deleteOne({ _id: id });
        res.json({
            success: true,
            message: "Workflow rule deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting workflow rule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete workflow rule",
        });
    }
};
/**
 * Get workflow logs
 * GET /api/settings/workflow-logs
 */
export const getWorkflowLogs = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { workflowRuleId, entityType, status, actionType, fromDate, toDate, limit = 50, } = req.query;
        const query: any = {
            organization: orgId,
        };
        if (workflowRuleId) {
            query.workflowRule = workflowRuleId;
        }
        if (entityType) {
            query.entityType = entityType;
        }
        if (status) {
            const normalizedStatus = String(status).trim().toLowerCase();
            if (["success", "failed", "pending"].includes(normalizedStatus)) {
                query.status = normalizedStatus;
            }
        }
        if (actionType) {
            query["actionsExecuted.actionType"] = actionType;
        }
        if (fromDate || toDate) {
            query.executedAt = {};
            if (fromDate)
                query.executedAt.$gte = new Date(String(fromDate));
            if (toDate)
                query.executedAt.$lte = new Date(String(toDate));
        }
        const logs = await WorkflowLog.find(query)
            .populate("workflowRule", "name module")
            .sort({ executedAt: -1 })
            .limit(parseLimit(limit));
        res.json({
            success: true,
            data: logs,
        });
    }
    catch (error) {
        console.error("Error fetching workflow logs:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow logs",
        });
    }
};
/**
 * Get workflow usage stats
 * GET /api/settings/workflow-rules/stats
 */
export const getWorkflowStats = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const customFunctions = await WorkflowLog.countDocuments({
            organization: orgId,
            executedAt: { $gte: today },
            "actionsExecuted.actionType": "custom_function",
        });
        const webhooks = await WorkflowLog.countDocuments({
            organization: orgId,
            executedAt: { $gte: today },
            "actionsExecuted.actionType": "webhook",
        });
        const emailAlerts = await WorkflowLog.countDocuments({
            organization: orgId,
            executedAt: { $gte: today },
            "actionsExecuted.actionType": { $in: ["send_email", "email_alert"] },
        });
        res.json({
            success: true,
            data: {
                customFunctions: { used: customFunctions, limit: 1000 },
                webhooks: { used: webhooks, limit: 1000 },
                emailAlerts: { used: emailAlerts, limit: 500 },
            },
        });
    }
    catch (error) {
        console.error("Error fetching workflow stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow stats",
        });
    }
};
/**
 * Get all workflow actions
 * GET /api/settings/workflow-actions
 */
export const getWorkflowActions = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { type, module, status } = req.query;
        const query: any = { organization: orgId };
        if (type && type !== "all")
            query.type = type;
        if (module && module !== "All")
            query.module = module;
        const isActive = parseBoolean(status);
        if (isActive !== undefined)
            query.isActive = isActive;
        const actions = await WorkflowAction.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: actions });
    }
    catch (error) {
        console.error("Error fetching workflow actions:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow actions",
        });
    }
};
/**
 * Create workflow action
 * POST /api/settings/workflow-actions
 */
export const createWorkflowAction = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { name, module, type, config, isActive } = req.body;
        if (!name || !module || !type) {
            res.status(400).json({ success: false, message: "Name, module, and type are required" });
            return;
        }
        let normalizedConfig;
        try {
            normalizedConfig = normalizeWorkflowActionConfig(type, config);
        }
        catch (validationError: any) {
            res.status(400).json({
                success: false,
                message: validationError?.message || "Invalid workflow action configuration",
            });
            return;
        }
        const action = await WorkflowAction.create({
            organization: orgId,
            name,
            module,
            type,
            config: normalizedConfig,
            isActive: isActive === undefined ? true : !!isActive,
            createdBy: req.user?.userId,
        });
        res.status(201).json({
            success: true,
            message: "Workflow action created successfully",
            data: action,
        });
    }
    catch (error) {
        console.error("Error creating workflow action:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create workflow action",
        });
    }
};
/**
 * Update workflow action
 * PUT /api/settings/workflow-actions/:id
 */
export const updateWorkflowAction = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const action = await WorkflowAction.findOne({ _id: id, organization: orgId });
        if (!action) {
            res.status(404).json({ success: false, message: "Workflow action not found" });
            return;
        }
        const { name, module, type, config, isActive } = req.body;
        const nextType = type !== undefined ? type : action.type;
        const nextConfig = config !== undefined ? config : action.config;
        let normalizedConfig;
        try {
            normalizedConfig = normalizeWorkflowActionConfig(nextType, nextConfig);
        }
        catch (validationError: any) {
            res.status(400).json({
                success: false,
                message: validationError?.message || "Invalid workflow action configuration",
            });
            return;
        }
        if (name !== undefined)
            action.name = name;
        if (module !== undefined)
            action.module = module;
        if (type !== undefined)
            action.type = type;
        action.config = normalizedConfig;
        if (isActive !== undefined)
            action.isActive = !!isActive;
        await action.save();
        res.json({
            success: true,
            message: "Workflow action updated successfully",
            data: action,
        });
    }
    catch (error) {
        console.error("Error updating workflow action:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update workflow action",
        });
    }
};
/**
 * Delete workflow action
 * DELETE /api/settings/workflow-actions/:id
 */
export const deleteWorkflowAction = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const deleted = await WorkflowAction.findOneAndDelete({ _id: id, organization: orgId });
        if (!deleted) {
            res.status(404).json({ success: false, message: "Workflow action not found" });
            return;
        }
        res.json({
            success: true,
            message: "Workflow action deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting workflow action:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete workflow action",
        });
    }
};
/**
 * Get workflow schedules
 * GET /api/settings/workflow-schedules
 */
export const getWorkflowSchedules = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { module, status, frequency } = req.query;
        const query: any = { organization: orgId };
        if (module && module !== "All")
            query.module = module;
        if (status && ["active", "inactive"].includes(String(status).toLowerCase())) {
            query.status = String(status).toLowerCase();
        }
        if (frequency)
            query.frequency = String(frequency).toLowerCase();
        const schedules = await WorkflowSchedule.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: schedules });
    }
    catch (error) {
        console.error("Error fetching workflow schedules:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch workflow schedules",
        });
    }
};
/**
 * Create workflow schedule
 * POST /api/settings/workflow-schedules
 */
export const createWorkflowSchedule = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const currentSchedulesCount = await WorkflowSchedule.countDocuments({ organization: orgId });
        if (currentSchedulesCount >= 10) {
            res.status(400).json({
                success: false,
                message: "You can create a maximum of 10 schedules",
            });
            return;
        }
        const payload = normalizeSchedulePayload(req.body || {});
        if (!payload.name || !payload.module || !payload.time) {
            res.status(400).json({ success: false, message: "Name, module, and time are required" });
            return;
        }
        if (!TIME_24H_REGEX.test(payload.time)) {
            res.status(400).json({ success: false, message: "Time must be in HH:mm format" });
            return;
        }
        if (payload.frequency === "weekly" && payload.days.length === 0) {
            res.status(400).json({ success: false, message: "Select at least one day for weekly schedules" });
            return;
        }
        if (payload.startDate && Number.isNaN(payload.startDate.getTime())) {
            res.status(400).json({ success: false, message: "Invalid start date" });
            return;
        }
        if (payload.endDate && Number.isNaN(payload.endDate.getTime())) {
            res.status(400).json({ success: false, message: "Invalid end date" });
            return;
        }
        if (payload.startDate) {
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            if (payload.startDate > oneYearFromNow) {
                res.status(400).json({
                    success: false,
                    message: "The start date of a schedule cannot be more than one year from creation date",
                });
                return;
            }
        }
        const schedule = await WorkflowSchedule.create({
            organization: orgId,
            name: payload.name,
            module: payload.module,
            frequency: payload.frequency as any,
            time: payload.time,
            days: payload.days,
            dayOfMonth: payload.dayOfMonth,
            monthOfYear: payload.monthOfYear,
            startDate: payload.startDate,
            endDate: payload.endDate,
            functionCode: payload.functionCode,
            metadata: payload.metadata,
            createdBy: req.user?.userId,
        });
        res.status(201).json({
            success: true,
            message: "Workflow schedule created successfully",
            data: schedule,
        });
    }
    catch (error) {
        console.error("Error creating workflow schedule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create workflow schedule",
        });
    }
};
/**
 * Update workflow schedule
 * PUT /api/settings/workflow-schedules/:id
 */
export const updateWorkflowSchedule = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const schedule = await WorkflowSchedule.findOne({ _id: id, organization: orgId });
        if (!schedule) {
            res.status(404).json({ success: false, message: "Workflow schedule not found" });
            return;
        }
        const payload = normalizeSchedulePayload({ ...schedule.toObject(), ...req.body });
        if (payload.time && !TIME_24H_REGEX.test(payload.time)) {
            res.status(400).json({ success: false, message: "Time must be in HH:mm format" });
            return;
        }
        if (payload.frequency === "weekly" && payload.days.length === 0) {
            res.status(400).json({ success: false, message: "Select at least one day for weekly schedules" });
            return;
        }
        if (payload.startDate && Number.isNaN(payload.startDate.getTime())) {
            res.status(400).json({ success: false, message: "Invalid start date" });
            return;
        }
        if (payload.endDate && Number.isNaN(payload.endDate.getTime())) {
            res.status(400).json({ success: false, message: "Invalid end date" });
            return;
        }
        if (payload.startDate) {
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            if (payload.startDate > oneYearFromNow) {
                res.status(400).json({
                    success: false,
                    message: "The start date of a schedule cannot be more than one year from creation date",
                });
                return;
            }
        }
        if (req.body?.name !== undefined)
            schedule.name = payload.name;
        if (req.body?.module !== undefined)
            schedule.module = payload.module;
        if (req.body?.frequency !== undefined || req.body?.scheduleType !== undefined) {
            schedule.frequency = payload.frequency as any;
        }
        if (req.body?.time !== undefined)
            schedule.time = payload.time;
        if (req.body?.days !== undefined)
            schedule.days = payload.days;
        if (req.body?.dayOfMonth !== undefined)
            schedule.dayOfMonth = payload.dayOfMonth;
        if (req.body?.monthOfYear !== undefined)
            schedule.monthOfYear = payload.monthOfYear;
        const nextStatus = req.body?.status;
        if (nextStatus !== undefined && ["active", "inactive"].includes(String(nextStatus).toLowerCase())) {
            schedule.status = String(nextStatus).toLowerCase() as any;
        }
        if (req.body?.startDate !== undefined)
            schedule.startDate = payload.startDate;
        if (req.body?.endDate !== undefined)
            schedule.endDate = payload.endDate;
        if (req.body?.functionCode !== undefined)
            schedule.functionCode = payload.functionCode;
        if (req.body?.metadata !== undefined)
            schedule.metadata = payload.metadata;
        await schedule.save();
        res.json({
            success: true,
            message: "Workflow schedule updated successfully",
            data: schedule,
        });
    }
    catch (error) {
        console.error("Error updating workflow schedule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update workflow schedule",
        });
    }
};
/**
 * Toggle workflow schedule status
 * PATCH /api/settings/workflow-schedules/:id/toggle
 */
export const toggleWorkflowSchedule = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const schedule = await WorkflowSchedule.findOne({ _id: id, organization: orgId });
        if (!schedule) {
            res.status(404).json({ success: false, message: "Workflow schedule not found" });
            return;
        }
        schedule.status = schedule.status === "active" ? "inactive" : "active";
        await schedule.save();
        res.json({
            success: true,
            message: `Workflow schedule ${schedule.status}`,
            data: schedule,
        });
    }
    catch (error) {
        console.error("Error toggling workflow schedule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to toggle workflow schedule",
        });
    }
};
/**
 * Delete workflow schedule
 * DELETE /api/settings/workflow-schedules/:id
 */
export const deleteWorkflowSchedule = async (req, res) => {
    try {
        const orgId = req.user?.organizationId;
        if (!orgId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { id } = req.params;
        const deleted = await WorkflowSchedule.findOneAndDelete({ _id: id, organization: orgId });
        if (!deleted) {
            res.status(404).json({ success: false, message: "Workflow schedule not found" });
            return;
        }
        res.json({
            success: true,
            message: "Workflow schedule deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting workflow schedule:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete workflow schedule",
        });
    }
};
export default {
    getWorkflowRules,
    getWorkflowRule,
    createWorkflowRule,
    updateWorkflowRule,
    deleteWorkflowRule,
    cloneWorkflowRule,
    reorderWorkflowRules,
    getWorkflowNotificationPreferences,
    updateWorkflowNotificationPreferences,
    getWorkflowActions,
    createWorkflowAction,
    updateWorkflowAction,
    deleteWorkflowAction,
    getWorkflowLogs,
    getWorkflowSchedules,
    createWorkflowSchedule,
    updateWorkflowSchedule,
    toggleWorkflowSchedule,
    deleteWorkflowSchedule,
    getWorkflowStats,
};
