import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Search, ArrowUpDown, ChevronRight, ChevronDown, Download, Upload, Settings, Eye, EyeOff, Info } from "lucide-react";
import { projectsAPI, timeEntriesAPI, customersAPI, usersAPI } from "../../services/api";
import toast from "react-hot-toast";
import NewCustomViewForm from "./NewCustomViewForm";
import NewLogEntryForm from "./NewLogEntryForm";
import BulkUpdateModal from "../purchases/shared/BulkUpdateModal";

export default function TimeTrackingProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("All");
  const [showCustomViewForm, setShowCustomViewForm] = useState(false);
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [selectedProjectForLog, setSelectedProjectForLog] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "card"
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [preferencesSubmenuOpen, setPreferencesSubmenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('name'); // 'name', 'customer', 'created', 'status'
  const [sortDirection, setSortDirection] = useState('asc');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showExportProjectsModal, setShowExportProjectsModal] = useState(false);
  const [exportCurrentViewData, setExportCurrentViewData] = useState({
    decimalFormat: "1234567.89",
    fileFormat: "CSV",
    password: "",
    showPassword: false
  });
  const [exportProjectsData, setExportProjectsData] = useState({
    module: "Projects",
    exportTemplate: "",
    decimalFormat: "1234567.89",
    fileFormat: "CSV",
    includePII: false,
    password: "",
    showPassword: false
  });
  const sortSubmenuRef = useRef(null);
  const importSubmenuRef = useRef(null);
  const exportSubmenuRef = useRef(null);
  const preferencesSubmenuRef = useRef(null);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [timerInterval, setTimerInterval] = useState(null);
  const [timerNotes, setTimerNotes] = useState("");
  const [selectedProjectForTimer, setSelectedProjectForTimer] = useState("");
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showProjectFields, setShowProjectFields] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [appliedAdvancedSearch, setAppliedAdvancedSearch] = useState<any | null>(null);
  const [searchModalData, setSearchModalData] = useState({
    projectName: "",
    customerName: "",
    billingMethod: "",
    status: "All"
  });
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const newDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [customerBulkOptions, setCustomerBulkOptions] = useState<any[]>([]);
  const [userBulkOptions, setUserBulkOptions] = useState<any[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Function to refresh projects from database
  const refreshProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await projectsAPI.getAll();
      // Handle response format: { success: true, data: [...] } or direct array
      const data = Array.isArray(response)
        ? response
        : (response?.data || []);

      // Transform database projects to match frontend format
      const transformedProjects = data.map(project => ({
        id: project._id || project.id,
        projectName: project.name || project.projectName,
        projectNumber: project.projectNumber || project.id,
        customerName: project.customer?.name || project.customerName,
        customerId: project.customer?._id || project.customerId,
        description: project.description || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        status: project.status || 'planning',
        budget: project.budget || 0,
        currency: project.currency || 'USD',
        billable: project.billable !== undefined ? project.billable : true,
        billingRate: project.billingRate || 0,
        billingMethod: project.billingMethod || 'hourly',
        assignedTo: project.assignedTo || [],
        tags: project.tags || [],
        tasks: project.tasks || [],
        users: project.assignedTo || [],
        ...project // Keep all other fields
      }));

      setProjects(transformedProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects: " + (error.message || "Unknown error"));
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load projects from database on mount and when location changes
  useEffect(() => {
    refreshProjects();

    // Listen for custom events (when projects are updated from other components)
    const handleProjectUpdate = () => {
      refreshProjects();
    };
    window.addEventListener('projectUpdated', handleProjectUpdate);

    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
    };
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const loadBulkUpdateOptions = async () => {
      try {
        const [customersResponse, usersResponse] = await Promise.all([
          customersAPI.getAll({ limit: 1000 }),
          usersAPI.getAll({ limit: 1000 }),
        ]);

        if (!mounted) return;

        const customersData = Array.isArray(customersResponse)
          ? customersResponse
          : (customersResponse?.data || []);
        const usersData = Array.isArray(usersResponse)
          ? usersResponse
          : (usersResponse?.data || []);

        const mappedCustomers = customersData
          .map((customer: any) => {
            const id = String(customer?._id || customer?.id || "").trim();
            const label = String(
              customer?.displayName ||
              customer?.name ||
              customer?.companyName ||
              `${customer?.firstName || ""} ${customer?.lastName || ""}`
            ).trim();
            if (!id || !label) return null;
            return { value: id, label };
          })
          .filter(Boolean);

        const mappedUsers = usersData
          .map((user: any) => {
            const id = String(user?._id || user?.id || "").trim();
            const computedName = String(
              user?.name ||
              `${user?.firstName || ""} ${user?.lastName || ""}`
            ).trim();
            const label = computedName || String(user?.email || "").trim();
            if (!id || !label) return null;
            return { value: id, label };
          })
          .filter(Boolean);

        setCustomerBulkOptions(mappedCustomers);
        setUserBulkOptions(mappedUsers);
      } catch (error) {
        console.error("Error loading bulk update options:", error);
      }
    };

    loadBulkUpdateOptions();

    return () => {
      mounted = false;
    };
  }, []);

  // Get billing method display text
  const getBillingMethodText = (method) => {
    const methodMap = {
      'fixed': 'Fixed Price',
      'hourly': 'Hourly Rate',
      'hourly-task': 'Hourly Rate Per Task',
      'milestone': 'Milestone'
    };
    return methodMap[method] || method || '--';
  };

  // Helper function to calculate elapsed time from start timestamp
  const calculateElapsedTime = (timerState) => {
    if (!timerState) return 0;

    // If timer is running, calculate from startTime
    if (timerState.isTimerRunning && timerState.startTime) {
      const timeSinceStart = Math.floor((Date.now() - timerState.startTime) / 1000);
      return (timerState.pausedElapsedTime || 0) + timeSinceStart;
    }

    // If timer is paused, return the paused elapsed time
    return timerState.pausedElapsedTime || timerState.elapsedTime || 0;
  };

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);

      // If timer was paused, resume it automatically when returning to the page
      // Pause state should not persist across page navigation
      let shouldResume = false;
      let elapsedTimeToResume = 0;

      if (!timerState.isTimerRunning && (timerState.pausedElapsedTime || timerState.elapsedTime || 0) > 0) {
        // Timer was paused, resume it
        shouldResume = true;
        elapsedTimeToResume = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
      } else if (timerState.isTimerRunning) {
        // Timer was running, calculate elapsed time
        elapsedTimeToResume = calculateElapsedTime(timerState);
      } else {
        elapsedTimeToResume = 0;
      }

      setElapsedTime(elapsedTimeToResume);
      setIsTimerRunning(shouldResume || timerState.isTimerRunning || false);
      setTimerNotes(timerState.timerNotes || '');
      setSelectedProjectForTimer(timerState.associatedProject || timerState.selectedProjectForTimer || '');

      // If resuming from pause, update localStorage to mark as running
      if (shouldResume) {
        const updatedTimerState = {
          ...timerState,
          startTime: Date.now(),
          pausedElapsedTime: elapsedTimeToResume,
          isTimerRunning: true,
          elapsedTime: elapsedTimeToResume
        };
        localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
      } else if (timerState.isTimerRunning && !timerState.startTime) {
        // If timer was running but startTime is missing, set it
        const pausedElapsed = timerState.elapsedTime || 0;
        const updatedTimerState = {
          ...timerState,
          startTime: Date.now(),
          pausedElapsedTime: pausedElapsed,
          elapsedTime: pausedElapsed
        };
        localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    let timerState;

    if (savedTimerState) {
      timerState = JSON.parse(savedTimerState);
    } else {
      timerState = {};
    }

    // Update timer state preserving startTime when running
    const updatedState = {
      ...timerState,
      pausedElapsedTime: isTimerRunning ? (timerState.pausedElapsedTime || 0) : elapsedTime,
      isTimerRunning,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer
    };

    // If timer is running, ensure startTime is set
    if (isTimerRunning && !updatedState.startTime) {
      updatedState.startTime = Date.now();
      updatedState.pausedElapsedTime = elapsedTime;
    }

    // If timer is paused, clear startTime
    if (!isTimerRunning && updatedState.startTime) {
      updatedState.pausedElapsedTime = elapsedTime;
      delete updatedState.startTime;
    }

    localStorage.setItem('timerState', JSON.stringify(updatedState));
  }, [elapsedTime, isTimerRunning, timerNotes, selectedProjectForTimer]);

  // Listen for storage changes (when timer is updated from other page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'timerState' && e.newValue) {
        const timerState = JSON.parse(e.newValue);

        // If timer was paused, resume it automatically
        let shouldResume = false;
        let calculatedElapsedTime = 0;

        if (!timerState.isTimerRunning && (timerState.pausedElapsedTime || timerState.elapsedTime || 0) > 0) {
          shouldResume = true;
          calculatedElapsedTime = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
          // Update localStorage to resume
          const updatedTimerState = {
            ...timerState,
            startTime: Date.now(),
            pausedElapsedTime: calculatedElapsedTime,
            isTimerRunning: true,
            elapsedTime: calculatedElapsedTime
          };
          localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
        } else {
          calculatedElapsedTime = calculateElapsedTime(timerState);
        }

        setElapsedTime(calculatedElapsedTime);
        setIsTimerRunning(shouldResume || timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setSelectedProjectForTimer(timerState.associatedProject || timerState.selectedProjectForTimer || '');
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = () => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);

        // If timer was paused, resume it automatically
        let shouldResume = false;
        let calculatedElapsedTime = 0;

        if (!timerState.isTimerRunning && (timerState.pausedElapsedTime || timerState.elapsedTime || 0) > 0) {
          shouldResume = true;
          calculatedElapsedTime = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
          // Update localStorage to resume
          const updatedTimerState = {
            ...timerState,
            startTime: Date.now(),
            pausedElapsedTime: calculatedElapsedTime,
            isTimerRunning: true,
            elapsedTime: calculatedElapsedTime
          };
          localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
        } else {
          calculatedElapsedTime = calculateElapsedTime(timerState);
        }

        setElapsedTime(calculatedElapsedTime);
        setIsTimerRunning(shouldResume || timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setSelectedProjectForTimer(timerState.associatedProject || timerState.selectedProjectForTimer || '');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timerStateUpdated', handleCustomStorage);

    // Poll for changes to update elapsed time (especially when timer is running)
    const pollInterval = setInterval(() => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);

        // If timer is paused, resume it automatically
        if (!timerState.isTimerRunning && (timerState.pausedElapsedTime || timerState.elapsedTime || 0) > 0) {
          const elapsedTimeToResume = timerState.pausedElapsedTime || timerState.elapsedTime || 0;
          const updatedTimerState = {
            ...timerState,
            startTime: Date.now(),
            pausedElapsedTime: elapsedTimeToResume,
            isTimerRunning: true,
            elapsedTime: elapsedTimeToResume
          };
          localStorage.setItem('timerState', JSON.stringify(updatedTimerState));
          setElapsedTime(elapsedTimeToResume);
          setIsTimerRunning(true);
        } else if (timerState.isTimerRunning) {
          // Always recalculate elapsed time from startTime if timer is running
          const calculatedElapsedTime = calculateElapsedTime(timerState);
          setElapsedTime(calculatedElapsedTime);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timerStateUpdated', handleCustomStorage);
      clearInterval(pollInterval);
    };
  }, []);

  // Timer functionality - update display every second
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        // Calculate elapsed time from startTime stored in localStorage
        const savedTimerState = localStorage.getItem('timerState');
        if (savedTimerState) {
          const timerState = JSON.parse(savedTimerState);
          if (timerState.isTimerRunning && timerState.startTime) {
            const calculatedElapsedTime = calculateElapsedTime(timerState);
            setElapsedTime(calculatedElapsedTime);
          }
        }
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format time as HH:MM for display in timer controls
  const formatTimeShort = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    // Get current elapsed time (if resuming from pause)
    const savedTimerState = localStorage.getItem('timerState');
    let pausedElapsed = elapsedTime;

    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      pausedElapsed = timerState.pausedElapsedTime || elapsedTime || 0;
    }

    // Set start time to now and store paused elapsed time
    const timerState = {
      startTime: Date.now(),
      pausedElapsedTime: pausedElapsed,
      isTimerRunning: true,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));

    setIsTimerRunning(true);
    setElapsedTime(pausedElapsed);
    setShowTimerModal(false);
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handlePauseTimer = () => {
    // Calculate final elapsed time before pausing
    const savedTimerState = localStorage.getItem('timerState');
    let finalElapsedTime = elapsedTime;

    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      if (timerState.isTimerRunning && timerState.startTime) {
        finalElapsedTime = calculateElapsedTime(timerState);
      }
    }

    setIsTimerRunning(false);
    setElapsedTime(finalElapsedTime);

    // Save paused state with elapsed time, clear startTime
    const timerState = {
      pausedElapsedTime: finalElapsedTime,
      elapsedTime: finalElapsedTime,
      isTimerRunning: false,
      timerNotes,
      associatedProject: selectedProjectForTimer,
      selectedProjectForTimer
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleStopTimer = () => {
    // Calculate final elapsed time before stopping
    const savedTimerState = localStorage.getItem('timerState');
    let finalElapsedTime = elapsedTime;

    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      if (timerState.isTimerRunning && timerState.startTime) {
        finalElapsedTime = calculateElapsedTime(timerState);
      } else {
        finalElapsedTime = timerState.pausedElapsedTime || timerState.elapsedTime || elapsedTime;
      }
    }

    setIsTimerRunning(false);

    // Save the time entry
    if (finalElapsedTime > 0) {
      const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
      const newEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        projectName: selectedProjectForTimer || '',
        taskName: selectedTaskForTimer || '',
        timeSpent: formatTimeShort(finalElapsedTime),
        billable: isBillable,
        user: '',
        notes: timerNotes,
        createdAt: new Date().toISOString()
      };
      existingEntries.push(newEntry);
      localStorage.setItem('timeEntries', JSON.stringify(existingEntries));

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('timeEntryUpdated'));

      // Show success message or notification
      alert('Time entry saved successfully!');
    }
    // Reset timer
    setElapsedTime(0);
    setTimerNotes('');
    setSelectedProjectForTimer('');
    setSelectedTaskForTimer('');
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleDeleteTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setTimerNotes('');
    setSelectedProjectForTimer('');
    setSelectedTaskForTimer('');
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        if (sortSubmenuRef.current && !sortSubmenuRef.current.contains(event.target)) {
          setSortSubmenuOpen(false);
        }
        if (importSubmenuRef.current && !importSubmenuRef.current.contains(event.target)) {
          setImportSubmenuOpen(false);
        }
        if (exportSubmenuRef.current && !exportSubmenuRef.current.contains(event.target)) {
          setExportSubmenuOpen(false);
        }
        if (preferencesSubmenuRef.current && !preferencesSubmenuRef.current.contains(event.target)) {
          setPreferencesSubmenuOpen(false);
        }
        if (!sortSubmenuRef.current?.contains(event.target) &&
          !importSubmenuRef.current?.contains(event.target) &&
          !exportSubmenuRef.current?.contains(event.target) &&
          !preferencesSubmenuRef.current?.contains(event.target)) {
          setShowMoreMenu(false);
        }
      }
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target)) {
        setShowNewDropdown(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };

    if (isDropdownOpen || showMoreMenu || showNewDropdown || showProjectDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, showMoreMenu, showNewDropdown, showProjectDropdown]);

  const views = [
    { id: "All", label: "All" },
    { id: "Inactive", label: "Inactive" },
    { id: "Active", label: "Active" }
  ];

  const handleViewSelect = (viewId) => {
    setSelectedView(viewId);
    setIsDropdownOpen(false);
  };

  // Field options for bulk update modal.
  const projectFieldOptions = useMemo(() => ([
    {
      value: "customer",
      label: "Customer Name",
      type: "select",
      options: customerBulkOptions,
    },
    {
      value: "name",
      label: "Project Name",
      type: "text",
      placeholder: "Enter project name",
    },
    {
      value: "billingMethod",
      label: "Billing Method",
      type: "select",
      options: [
        { value: "fixed", label: "Fixed Price" },
        { value: "hourly", label: "Hourly Rate" },
        { value: "hourly-task", label: "Hourly Rate Per Task" },
        { value: "milestone", label: "Milestone" },
      ],
    },
    {
      value: "billingRate",
      label: "Rate",
      type: "number",
      min: 0,
      step: "0.01",
      placeholder: "0.00",
    },
    {
      value: "startDate",
      label: "Start Date",
      type: "date",
    },
    {
      value: "endDate",
      label: "End Date",
      type: "date",
    },
    {
      value: "assignedTo",
      label: "User",
      type: "select",
      options: userBulkOptions,
    },
    {
      value: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "planning", label: "Planning" },
        { value: "active", label: "Active" },
        { value: "on_hold", label: "On Hold" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ]), [customerBulkOptions, userBulkOptions]);

  const isValidObjectId = (value: string) => /^[0-9a-fA-F]{24}$/.test(String(value || ""));

  // Handle bulk update
  const handleBulkUpdate = async (field, value, selectedOption) => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project to update.");
      return;
    }

    if (isBulkActionLoading) return;

    const selectedIds = selectedProjects.map((id) => String(id));
    const fieldLabel = projectFieldOptions.find(opt => opt.value === field)?.label || field;

    let normalizedValue: any = value;

    if (selectedOption?.type === "number") {
      const parsedValue = Number(value);
      if (Number.isNaN(parsedValue)) {
        alert("Please enter a valid number.");
        return;
      }
      normalizedValue = parsedValue;
    }

    if ((field === "customer" || field === "assignedTo") && normalizedValue && !isValidObjectId(normalizedValue)) {
      alert("Please select a valid value from the dropdown.");
      return;
    }

    const updateData: any = {};
    if (field === "assignedTo") {
      updateData.assignedTo = normalizedValue ? [normalizedValue] : [];
    } else {
      updateData[field] = normalizedValue;
    }

    const selectedChoice = Array.isArray(selectedOption?.options)
      ? selectedOption.options.find((choice: any) => {
        if (typeof choice === "object") return String(choice.value) === String(normalizedValue);
        return String(choice) === String(normalizedValue);
      })
      : null;
    const displayValue = selectedChoice
      ? (typeof selectedChoice === "object" ? selectedChoice.label : selectedChoice)
      : normalizedValue;

    setIsBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => projectsAPI.update(id, updateData))
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const succeededCount = results.length - failedCount;

      if (succeededCount === 0) {
        throw new Error("No selected projects were updated.");
      }

      setSuccessMessage(
        `Successfully updated ${succeededCount} project${succeededCount > 1 ? "s" : ""} - ${fieldLabel} set to "${displayValue}".`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      if (failedCount > 0) {
        toast.error(`${failedCount} project${failedCount > 1 ? "s" : ""} could not be updated.`);
      }

      setSelectedProjects([]);
      await refreshProjects();
      window.dispatchEvent(new Event("projectUpdated"));
    } catch (error: any) {
      console.error("Error bulk updating projects:", error);
      toast.error(error?.message || "Failed to update selected projects.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (statusValue: string, successText: string) => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project.");
      return;
    }

    if (isBulkActionLoading) return;

    const selectedIds = selectedProjects.map((id) => String(id));

    setIsBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => projectsAPI.update(id, { status: statusValue }))
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const succeededCount = results.length - failedCount;

      if (succeededCount === 0) {
        throw new Error("No selected projects were updated.");
      }

      setSuccessMessage(
        `The selected Project${succeededCount > 1 ? "s have" : " has"} been marked as ${successText}.`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      if (failedCount > 0) {
        toast.error(`${failedCount} project${failedCount > 1 ? "s" : ""} could not be updated.`);
      }

      setSelectedProjects([]);
      await refreshProjects();
      window.dispatchEvent(new Event("projectUpdated"));
    } catch (error: any) {
      console.error("Error updating project status:", error);
      toast.error(error?.message || "Failed to update selected projects.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project to delete.");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    if (isBulkActionLoading) return;

    const selectedIds = selectedProjects.map((id) => String(id));

    setIsBulkActionLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => projectsAPI.delete(id))
      );

      const failedCount = results.filter((result) => result.status === "rejected").length;
      const succeededCount = results.length - failedCount;

      if (succeededCount === 0) {
        throw new Error("No selected projects were deleted.");
      }

      setSuccessMessage(
        `Successfully deleted ${succeededCount} project${succeededCount > 1 ? "s" : ""}.`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      if (failedCount > 0) {
        toast.error(`${failedCount} project${failedCount > 1 ? "s" : ""} could not be deleted.`);
      }

      setSelectedProjects([]);
      await refreshProjects();
      window.dispatchEvent(new Event("projectUpdated"));
    } catch (error: any) {
      console.error("Error deleting selected projects:", error);
      toast.error(error?.message || "Failed to delete selected projects.");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Sort options for projects
  const sortOptions = ['Project Name', 'Customer Name', 'Created Time', 'Status'];

  // Sorting function
  const getSortedProjects = (projectsList) => {
    const sorted = [...projectsList];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (selectedSort) {
        case 'name':
          aValue = (a.projectName || "").toLowerCase();
          bValue = (b.projectName || "").toLowerCase();
          break;
        case 'customer':
          aValue = (a.customerName || "").toLowerCase();
          bValue = (b.customerName || "").toLowerCase();
          break;
        case 'created':
          aValue = a.createdTime ? new Date(a.createdTime).getTime() : 0;
          bValue = b.createdTime ? new Date(b.createdTime).getTime() : 0;
          break;
        case 'status':
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  };

  // Get filtered and sorted projects (memoized)
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(project => {
      const normalizedStatus = String(project.status || "").toLowerCase();

      // Filter by view
      if (selectedView === 'Active' && normalizedStatus !== 'active') return false;
      if (selectedView === 'Inactive' && normalizedStatus === 'active') return false;

      // Filter by search term
      if (searchTerm) {
        return project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });

    if (appliedAdvancedSearch) {
      filtered = filtered.filter((project) => {
        const projectName = (project.projectName || "").toLowerCase();
        const customerName = (project.customerName || "").toLowerCase();
        const billingMethod = String(project.billingMethod || "").toLowerCase();
        const status = String(project.status || "").toLowerCase();

        if (appliedAdvancedSearch.projectName && !projectName.includes(appliedAdvancedSearch.projectName.toLowerCase())) return false;
        if (appliedAdvancedSearch.customerName && !customerName.includes(appliedAdvancedSearch.customerName.toLowerCase())) return false;
        if (appliedAdvancedSearch.billingMethod && !billingMethod.includes(appliedAdvancedSearch.billingMethod.toLowerCase())) return false;
        if (appliedAdvancedSearch.status && appliedAdvancedSearch.status !== "All") {
          const normalizedFilterStatus = String(appliedAdvancedSearch.status).toLowerCase();
          if (normalizedFilterStatus === "active" && status !== "active") return false;
          if (normalizedFilterStatus === "inactive" && status === "active") return false;
          if (normalizedFilterStatus !== "active" && normalizedFilterStatus !== "inactive" && status !== normalizedFilterStatus) return false;
        }
        return true;
      });
    }

    return getSortedProjects(filtered);
  }, [projects, selectedView, searchTerm, selectedSort, sortDirection, appliedAdvancedSearch]);

  // Handle sort selection
  const handleSortSelect = (sortOption) => {
    const sortMap = {
      'Project Name': 'name',
      'Customer Name': 'customer',
      'Created Time': 'created',
      'Status': 'status'
    };
    const sortKey = sortMap[sortOption] || 'name';

    if (selectedSort === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSelectedSort(sortKey);
      setSortDirection('asc');
    }
    setSortSubmenuOpen(false);
  };

  // Helper function to format billing type
  const formatBillingType = (billingMethod) => {
    const methodMap = {
      'fixed': 'Fixed Price',
      'hourly': 'Hourly Rate',
      'hourly-task': 'Task Based Hourly Billing',
      'milestone': 'Milestone Based'
    };
    return methodMap[billingMethod] || billingMethod || '--';
  };

  // Helper function to format budget type
  const formatBudgetType = (hoursBudgetType) => {
    if (!hoursBudgetType || hoursBudgetType === '') return 'No Budget';
    const typeMap = {
      'total-project-hours': 'Total Project Hours',
      'hours-per-task': 'Hours Per Task',
      'hours-per-staff': 'Hours Per Staff'
    };
    return typeMap[hoursBudgetType] || hoursBudgetType;
  };

  // Export tasks function
  const exportTasks = (format, projectsToExport) => {
    // Collect all tasks from all projects
    const allTasks = [];
    projectsToExport.forEach((project) => {
      const projectTasks = project.tasks || [];
      projectTasks.forEach((task, taskIndex) => {
        allTasks.push({
          taskId: `${(project._id || project.id || "").toString()}_${taskIndex}`,
          taskName: task.taskName || "",
          description: task.description || "",
          projectName: project.name || project.projectName || "",
          taskRatePerHour: task.rate || task.hourlyRate || task.billingRate || 0,
          taskBudgetHours: task.budgetHours || "00:00",
          isBillable: task.billable !== undefined ? task.billable : true,
          taskStatus: task.status || "Active"
        });
      });
    });

    const exportData = allTasks.slice(0, 25000);

    // Define all columns as per the image
    const headers = [
      "Task ID",
      "Task Name",
      "Description",
      "Project Name",
      "Task Rate Per Hour",
      "Task Budget Hours",
      "Is Billable",
      "Task Status"
    ];

    if (format === "csv") {
      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      exportData.forEach((task) => {
        const row = [
          `"${task.taskId.replace(/"/g, '""')}"`,
          `"${task.taskName.replace(/"/g, '""')}"`,
          `"${task.description.replace(/"/g, '""')}"`,
          `"${task.projectName.replace(/"/g, '""')}"`,
          `"${task.taskRatePerHour}"`,
          `"${task.taskBudgetHours}"`,
          `"${task.isBillable ? 'TRUE' : 'FALSE'}"`,
          `"${task.taskStatus.replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `project_tasks_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For XLS/XLSX, create HTML table format that Excel can open
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
              td { padding: 8px; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData.map(task => {
        return `
                    <tr>
                      <td>${task.taskId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.taskName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${task.taskRatePerHour}</td>
                      <td>${task.taskBudgetHours}</td>
                      <td>${task.isBillable ? 'TRUE' : 'FALSE'}</td>
                      <td>${task.taskStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Determine MIME type and file extension
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel";
      const fileExtension = format === "xlsx" ? "xlsx" : "xls";

      const blob = new Blob([htmlContent], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `project_tasks_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Export timesheets function
  const exportTimesheets = async (format) => {
    try {
      // Fetch all time entries from the database
      const response = await timeEntriesAPI.getAll();
      const data = Array.isArray(response)
        ? response
        : (response?.data || []);

      const exportData = data.slice(0, 25000);

      // Define all columns as per the image
      const headers = [
        "Timesheet ID",
        "Project Name",
        "Task Name",
        "Staff Name",
        "Email",
        "Staff Rate",
        "Notes",
        "Time Spent",
        "Begin time",
        "End time",
        "Date",
        "Project Days",
        "Billable Status",
        "Billed Status"
      ];

      // Helper function to format time from hours and minutes
      const formatTimeSpent = (hours, minutes) => {
        const h = hours || 0;
        const m = minutes || 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      // Helper function to format date
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          const date = new Date(dateStr);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (e) {
          return dateStr;
        }
      };

      if (format === "csv") {
        let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

        exportData.forEach((entry) => {
          const timesheetId = (entry._id || entry.id || "").toString();
          const projectName = entry.project?.name || entry.projectName || "";
          const taskName = entry.task || entry.taskName || "";
          const staffName = entry.user?.name || entry.userName || "";
          const email = entry.user?.email || entry.userEmail || "";
          const staffRate = entry.billingRate || entry.rate || "";
          const notes = entry.description || entry.notes || "";
          const timeSpent = formatTimeSpent(entry.hours, entry.minutes);
          const beginTime = entry.startTime || entry.beginTime || "";
          const endTime = entry.endTime || "";
          const date = formatDate(entry.date);
          const projectDays = 0; // Default value
          const billableStatus = entry.billable ? "Billable" : "Non-Billable";
          const billedStatus = entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed"
            ? "Billed"
            : "Unbilled";

          const row = [
            `"${timesheetId.replace(/"/g, '""')}"`,
            `"${projectName.replace(/"/g, '""')}"`,
            `"${taskName.replace(/"/g, '""')}"`,
            `"${staffName.replace(/"/g, '""')}"`,
            `"${email.replace(/"/g, '""')}"`,
            `"${staffRate}"`,
            `"${notes.replace(/"/g, '""')}"`,
            `"${timeSpent}"`,
            `"${beginTime}"`,
            `"${endTime}"`,
            `"${date}"`,
            `"${projectDays}"`,
            `"${billableStatus.replace(/"/g, '""')}"`,
            `"${billedStatus.replace(/"/g, '""')}"`
          ];
          csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `timesheets_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For XLS/XLSX, create HTML table format that Excel can open
        let htmlContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta charset="utf-8">
              <style>
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
                td { padding: 8px; border: 1px solid #d1d5db; }
              </style>
            </head>
            <body>
              <table>
                <thead>
                  <tr>
                    ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${exportData.map(entry => {
          const timesheetId = (entry._id || entry.id || "").toString();
          const projectName = entry.project?.name || entry.projectName || "";
          const taskName = entry.task || entry.taskName || "";
          const staffName = entry.user?.name || entry.userName || "";
          const email = entry.user?.email || entry.userEmail || "";
          const staffRate = entry.billingRate || entry.rate || "";
          const notes = entry.description || entry.notes || "";
          const timeSpent = formatTimeSpent(entry.hours, entry.minutes);
          const beginTime = entry.startTime || entry.beginTime || "";
          const endTime = entry.endTime || "";
          const date = formatDate(entry.date);
          const projectDays = 0;
          const billableStatus = entry.billable ? "Billable" : "Non-Billable";
          const billedStatus = entry.billingStatus === "Invoiced" || entry.billingStatus === "Billed"
            ? "Billed"
            : "Unbilled";

          return `
                      <tr>
                        <td>${timesheetId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${taskName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${staffName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${email.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${staffRate}</td>
                        <td>${notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${timeSpent}</td>
                        <td>${beginTime}</td>
                        <td>${endTime}</td>
                        <td>${date}</td>
                        <td>${projectDays}</td>
                        <td>${billableStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                        <td>${billedStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      </tr>
                    `;
        }).join("")}
                </tbody>
              </table>
            </body>
          </html>
        `;

        // Determine MIME type and file extension
        const mimeType = format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.ms-excel";
        const fileExtension = format === "xlsx" ? "xlsx" : "xls";

        const blob = new Blob([htmlContent], { type: mimeType });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `timesheets_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting timesheets:", error);
      toast.error("Failed to export timesheets: " + (error.message || "Unknown error"));
    }
  };

  // Export current view function (simplified columns)
  const exportCurrentView = (format, projectsToExport) => {
    const exportData = projectsToExport.slice(0, 10000); // Limit to 10,000 as per modal note

    // Define simplified columns as per the image
    const headers = [
      "PROJECT_ID",
      "Customer Name",
      "Project Name",
      "Billing Method",
      "Rate"
    ];

    if (format === "csv") {
      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      exportData.forEach((project) => {
        const projectId = (project._id || project.id || "").toString();
        const customerName = project.customer?.name || project.customerName || "";
        const projectName = project.name || project.projectName || "";
        const billingMethod = formatBillingType(project.billingMethod);
        const rate = project.billingRate || "";

        const row = [
          `"${projectId.replace(/"/g, '""')}"`,
          `"${customerName.replace(/"/g, '""')}"`,
          `"${projectName.replace(/"/g, '""')}"`,
          `"${billingMethod.replace(/"/g, '""')}"`,
          `"${rate}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `current_view_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For XLS/XLSX, create HTML table format that Excel can open
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
              td { padding: 8px; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData.map(project => {
        const projectId = (project._id || project.id || "").toString();
        const customerName = project.customer?.name || project.customerName || "";
        const projectName = project.name || project.projectName || "";
        const billingMethod = formatBillingType(project.billingMethod);
        const rate = project.billingRate || "";

        return `
                    <tr>
                      <td>${projectId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${customerName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${billingMethod.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${rate}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Determine MIME type and file extension
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel";
      const fileExtension = format === "xlsx" ? "xlsx" : "xls";

      const blob = new Blob([htmlContent], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `current_view_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Export function
  const exportProjects = (format, projectsToExport) => {
    const exportData = projectsToExport.slice(0, 25000);

    // Define all columns as per the image
    const headers = [
      "Project ID",
      "Project Name",
      "Project Code",
      "Description",
      "Billing Type",
      "Project Cost",
      "Customer Name",
      "Currency Code",
      "Budget Type",
      "Budget Amount",
      "Cost Budget",
      "Project Budget Hours",
      "Project Status",
      "Billing Rate Frequency",
      "Hours Per Day"
    ];

    if (format === "csv") {
      let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      exportData.forEach((project) => {
        const projectId = (project._id || project.id || "").toString();
        const projectName = project.name || project.projectName || "";
        const projectCode = project.projectNumber || project.id || "";
        const description = project.description || "";
        const billingType = formatBillingType(project.billingMethod);
        const projectCost = project.budget || 0;
        const customerName = project.customer?.name || project.customerName || "";
        const currencyCode = project.currency || "USD";
        const budgetType = formatBudgetType(project.hoursBudgetType);
        const budgetAmount = project.budget || 0;
        const costBudget = project.budget || 0;
        const projectBudgetHours = project.totalBudgetHours || "0";
        const projectStatus = project.status || "Active";
        const billingRateFrequency = project.billingMethod === 'hourly' ? 'hourly' : (project.billingMethod || 'hourly');
        const hoursPerDay = "00:00"; // Default value

        const row = [
          `"${projectId.replace(/"/g, '""')}"`,
          `"${projectName.replace(/"/g, '""')}"`,
          `"${projectCode.toString().replace(/"/g, '""')}"`,
          `"${description.replace(/"/g, '""')}"`,
          `"${billingType.replace(/"/g, '""')}"`,
          `"${projectCost}"`,
          `"${customerName.replace(/"/g, '""')}"`,
          `"${currencyCode.replace(/"/g, '""')}"`,
          `"${budgetType.replace(/"/g, '""')}"`,
          `"${budgetAmount}"`,
          `"${costBudget}"`,
          `"${projectBudgetHours}"`,
          `"${projectStatus.replace(/"/g, '""')}"`,
          `"${billingRateFrequency.replace(/"/g, '""')}"`,
          `"${hoursPerDay}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `projects_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // For XLS/XLSX, create HTML table format that Excel can open
      let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th { background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
              td { padding: 8px; border: 1px solid #d1d5db; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData.map(project => {
        const projectId = (project._id || project.id || "").toString();
        const projectName = project.name || project.projectName || "";
        const projectCode = project.projectNumber || project.id || "";
        const description = project.description || "";
        const billingType = formatBillingType(project.billingMethod);
        const projectCost = project.budget || 0;
        const customerName = project.customer?.name || project.customerName || "";
        const currencyCode = project.currency || "USD";
        const budgetType = formatBudgetType(project.hoursBudgetType);
        const budgetAmount = project.budget || 0;
        const costBudget = project.budget || 0;
        const projectBudgetHours = project.totalBudgetHours || "0";
        const projectStatus = project.status || "Active";
        const billingRateFrequency = project.billingMethod === 'hourly' ? 'hourly' : (project.billingMethod || 'hourly');
        const hoursPerDay = "00:00";

        return `
                    <tr>
                      <td>${projectId.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectCode.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${billingType.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${projectCost}</td>
                      <td>${customerName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${currencyCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${budgetType.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${budgetAmount}</td>
                      <td>${costBudget}</td>
                      <td>${projectBudgetHours}</td>
                      <td>${projectStatus.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${billingRateFrequency.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
                      <td>${hoursPerDay}</td>
                    </tr>
                  `;
      }).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Determine MIME type and file extension
      const mimeType = format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel";
      const fileExtension = format === "xlsx" ? "xlsx" : "xls";

      const blob = new Blob([htmlContent], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `projects_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Header */}
      {selectedProjects.length === 0 && (
        <div className="flex justify-between items-center px-6 py-3 bg-white border-b border-gray-200 sticky top-14 z-[100] shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          {/* Left: All Projects Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
          >
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <span className="text-lg font-semibold text-gray-800">
                All Projects
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4.5l3 3 3-3" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[200px] z-[1000] py-2">
                {views.map((view) => (
                  <div
                    key={view.id}
                    onClick={() => handleViewSelect(view.id)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer rounded border mx-2 mb-1 ${selectedView === view.id ? 'bg-[#156372]/10 border-[#156372]' : 'bg-transparent border-transparent hover:bg-[#156372]/10'}`}
                  >
                    <span className="text-sm text-[#333]">
                      {view.label}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <svg
                        d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5L8 2z"
                        stroke="#156372"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ))}

                {/* New Custom View */}
                <div
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setShowCustomViewForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 cursor-pointer mt-1 mx-2 border-t border-gray-200 pt-3 hover:bg-gray-100"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3v10M3 8h10" stroke="#156372" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-sm text-[#156372] font-medium">
                    New Custom View
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3 pr-4">
            {/* View Toggle - Segmented Button */}
            <div className="flex border border-gray-200 rounded overflow-hidden bg-gray-50">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 border-none cursor-pointer flex items-center justify-center text-sm text-gray-700 border-r border-gray-200 ${viewMode === 'list' ? 'bg-white' : 'bg-transparent'}`}
              >
                â˜°
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 border-none cursor-pointer flex items-center justify-center text-sm text-gray-700 ${viewMode === 'grid' ? 'bg-white' : 'bg-transparent'}`}
              >
                âŠž
              </button>
            </div>

            {/* Timer Display - Show when timer is running or has elapsed time */}
            {(isTimerRunning || elapsedTime > 0) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                {/* Clock Icon with 'i' */}
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="9" stroke="#156372" strokeWidth="1.5" fill="#e3f2fd" />
                    <path d="M10 6v4l3 2" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-[#156372] top-0.5 right-0.5">i</span>
                </div>

                {/* Time Display */}
                <span className="text-sm font-semibold text-gray-800 font-mono min-w-[70px]">
                  {formatTimeShort(elapsedTime)}
                </span>

                {/* Pause Button */}
                <button
                  onClick={handlePauseTimer}
                  className="w-7 h-7 flex items-center justify-center bg-[#156372] border-none rounded cursor-pointer p-0 hover:bg-[#0D4A52]"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="2" width="2" height="8" fill="white" rx="0.5" />
                    <rect x="7" y="2" width="2" height="8" fill="white" rx="0.5" />
                  </svg>
                </button>

                {/* Stop Button */}
                <button
                  onClick={handleStopTimer}
                  className="w-7 h-7 flex items-center justify-center bg-[#156372] border-none rounded cursor-pointer p-0 hover:bg-[#0D4A52]"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="8" height="8" fill="white" rx="1" />
                  </svg>
                </button>

                {/* Delete Button */}
                <button
                  onClick={handleDeleteTimer}
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(21, 99, 114, 0.1)';
                    e.target.style.borderColor = '#156372';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* Start Button - Show when timer is not running */}
            {!(isTimerRunning || elapsedTime > 0) && (
              <button
                onClick={() => setShowTimerModal(true)}
                style={{
                  backgroundColor: "#156372",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0D4A52"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#156372"}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
                  <path d="M8 5v3l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Start
              </button>
            )}

            {/* New Button with Dropdown */}
            <div ref={newDropdownRef} style={{ position: "relative", display: "flex", alignItems: "center", overflow: "visible", zIndex: 101 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => navigate("/time-tracking/projects/new")}
                  style={{
                    backgroundColor: "#156372",
                    color: "white",
                    border: "none",
                    borderRadius: "6px 0 0 6px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0e4a5e"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#156372"}
                >
                  <span style={{ fontSize: "16px" }}>+</span>
                  New
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewDropdown(!showNewDropdown);
                  }}
                  style={{
                    backgroundColor: "#156372",
                    color: "white",
                    border: "none",
                    borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "0 6px 6px 0",
                    padding: "8px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#0e4a5e";
                    e.currentTarget.style.outline = "2px solid #3b82f6";
                    e.currentTarget.style.outlineOffset = "-2px";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#156372";
                    e.currentTarget.style.outline = "none";
                  }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Dropdown Menu */}
              {showNewDropdown && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: "0",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  minWidth: "220px",
                  width: "max-content",
                  maxWidth: "280px",
                  zIndex: 10000,
                  padding: "4px 0",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  isolation: "isolate",
                  marginRight: "0"
                }}>
                  {/* New Log Entry */}
                  <div
                    onClick={() => {
                      setShowLogEntryForm(true);
                      setShowNewDropdown(false);
                    }}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#1f2937",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      backgroundColor: "transparent",
                      transition: "background-color 0.15s, color 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#3b82f6";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.border = "1px solid #3b82f6";
                      e.currentTarget.style.borderRadius = "4px";
                      e.currentTarget.style.margin = "2px 4px";
                      const svg = e.currentTarget.querySelector('svg path');
                      if (svg) svg.setAttribute('stroke', 'white');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#1f2937";
                      e.currentTarget.style.border = "none";
                      e.currentTarget.style.borderRadius = "0";
                      e.currentTarget.style.margin = "0";
                      const svg = e.currentTarget.querySelector('svg path');
                      if (svg) svg.setAttribute('stroke', '#1f2937');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>New Log Entry</span>
                  </div>

                  {/* New Weekly Time Log */}
                  <div
                    onClick={() => {
                      window.open('/time-tracking/timesheet/weekly', '_self', 'noopener,noreferrer');
                      setShowNewDropdown(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm text-gray-800 bg-transparent transition-all duration-150 rounded border border-transparent hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:mx-1 hover:my-0.5 group"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="18" rx="2" className="stroke-gray-800 group-hover:stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 2V6M8 2V6M3 10H21" className="stroke-gray-800 group-hover:stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>New Weekly Time Log</span>
                  </div>

                  {/* Timer - Chrome Extension */}
                  <div
                    onClick={() => {
                      setShowTimerModal(true);
                      setShowNewDropdown(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm text-gray-800 bg-transparent transition-all duration-150 rounded border border-transparent hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:mx-1 hover:my-0.5"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#4285F4" />
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#34A853" />
                      <path d="M12 2c2.42 0 4.64.82 6.4 2.18L12 12V2z" fill="#FBBC05" />
                      <path d="M2 12c0 2.42.82 4.64 2.18 6.4L12 12H2z" fill="#EA4335" />
                    </svg>
                    <span>Timer - Chrome Extension</span>
                  </div>
                </div>
              )}
            </div>

            {/* Three Dots Menu */}
            <div
              ref={moreMenuRef}
              className="relative"
              onMouseEnter={() => {
                setShowMoreMenu(true);
              }}
              onMouseLeave={() => {
                setShowMoreMenu(false);
                setSortSubmenuOpen(false);
                setImportSubmenuOpen(false);
                setExportSubmenuOpen(false);
                setPreferencesSubmenuOpen(false);
              }}
            >
              <button
                className="w-8 h-8 flex items-center justify-center cursor-pointer bg-transparent border border-gray-200 rounded text-lg text-gray-500 p-0 transition-colors hover:bg-gray-100"
              >
                â‹¯
              </button>

              {/* More Menu Dropdown */}
              {showMoreMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 mt-2 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[220px] z-[1000] border border-gray-200 py-1"
                >
                  {/* Sort by */}
                  <div className="relative" ref={sortSubmenuRef}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const newState = !sortSubmenuOpen;
                        setSortSubmenuOpen(newState);
                        if (newState) {
                          setImportSubmenuOpen(false);
                          setExportSubmenuOpen(false);
                          setPreferencesSubmenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer group hover:bg-[#156372] hover:text-white hover:rounded hover:mx-1 hover:border-transparent ${sortSubmenuOpen ? "bg-[#156372] text-white" : "bg-transparent text-gray-800"}`}
                    >
                      <div className="flex items-center gap-3">
                        <ArrowUpDown size={16} className={`group-hover:text-white ${sortSubmenuOpen ? "text-white" : "text-[#156372]"}`} />
                        <span className="text-sm">Sort by</span>
                      </div>
                      <ChevronRight size={12} className={`group-hover:text-white ${sortSubmenuOpen ? "text-white" : "text-gray-500"}`} />
                    </div>
                    {sortSubmenuOpen && (
                      <div className="absolute top-0 right-full mr-2 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[180px] border border-gray-200 z-[1001] py-1">
                        {sortOptions.map((option) => {
                          const sortMap = {
                            'Project Name': 'name',
                            'Customer Name': 'customer',
                            'Created Time': 'created',
                            'Status': 'status'
                          };
                          const sortKey = sortMap[option];
                          const isSelected = selectedSort === sortKey;

                          return (
                            <button
                              key={option}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSortSelect(option);
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between cursor-pointer border-none bg-transparent hover:bg-[#156372] hover:text-white ${isSelected ? "bg-blue-50 text-gray-900" : "text-gray-900"}`}
                            >
                              <span>{option}</span>
                              {isSelected && (
                                <span className="text-xs text-[#156372]">
                                  {sortDirection === "asc" ? "â†‘" : "â†“"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Import */}
                  <div className="relative" ref={importSubmenuRef}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const newState = !importSubmenuOpen;
                        setImportSubmenuOpen(newState);
                        if (newState) {
                          setSortSubmenuOpen(false);
                          setExportSubmenuOpen(false);
                          setPreferencesSubmenuOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer group hover:bg-[#156372] hover:text-white hover:rounded hover:mx-1 hover:border-transparent ${importSubmenuOpen ? "bg-[#156372] text-white" : "bg-transparent text-gray-800"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Download size={16} className={`group-hover:text-white ${importSubmenuOpen ? "text-white" : "text-gray-500"}`} />
                        <span className="text-sm">Import</span>
                      </div>
                      <ChevronRight size={12} className={`group-hover:text-white ${importSubmenuOpen ? "text-white" : "text-gray-500"}`} />
                    </div>
                    {importSubmenuOpen && (
                      <div className="absolute top-0 right-full mr-2 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[200px] border border-gray-200 z-[1001] py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/time-tracking/projects/import");
                            setImportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-sm text-left cursor-pointer border-none bg-transparent text-gray-900 hover:bg-[#156372] hover:text-white"
                        >
                          Import Projects
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/time-tracking/projects/import-tasks");
                            setImportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-sm text-left cursor-pointer border-none bg-transparent text-gray-900 hover:bg-[#156372] hover:text-white"
                        >
                          Import Project Tasks
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/time-tracking/timesheet/import");
                            setImportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-sm text-left cursor-pointer border-none bg-transparent text-gray-900 hover:bg-[#156372] hover:text-white"
                        >
                          Import Timesheet
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Export */}
                  <div style={{ position: "relative" }} ref={exportSubmenuRef}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const newState = !exportSubmenuOpen;
                        setExportSubmenuOpen(newState);
                        if (newState) {
                          setSortSubmenuOpen(false);
                          setImportSubmenuOpen(false);
                          setPreferencesSubmenuOpen(false);
                        }
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: exportSubmenuOpen ? "#156372" : "transparent",
                        color: exportSubmenuOpen ? "white" : ""
                      }}
                      onMouseEnter={(e) => {
                        if (!exportSubmenuOpen) {
                          e.currentTarget.style.backgroundColor = "#156372";
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.border = "1px solid #156372";
                          e.currentTarget.style.borderRadius = "4px";
                          e.currentTarget.style.margin = "2px 4px";
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) {
                            const paths = icon.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', 'white'));
                          }
                          const chevron = e.currentTarget.querySelector('svg:last-child');
                          if (chevron) {
                            const paths = chevron.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', 'white'));
                          }
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.color = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!exportSubmenuOpen) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "";
                          e.currentTarget.style.border = "none";
                          e.currentTarget.style.borderRadius = "0";
                          e.currentTarget.style.margin = "0";
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) {
                            const paths = icon.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', '#666'));
                          }
                          const chevron = e.currentTarget.querySelector('svg:last-child');
                          if (chevron) {
                            const paths = chevron.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', '#666'));
                          }
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.color = '#333';
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Upload size={16} style={{ color: exportSubmenuOpen ? "white" : "#666" }} />
                        <span style={{ fontSize: "14px", color: exportSubmenuOpen ? "white" : "#333" }}>Export</span>
                      </div>
                      <ChevronRight size={12} style={{ color: exportSubmenuOpen ? "white" : "#666" }} />
                    </div>
                    {exportSubmenuOpen && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        right: "100%",
                        marginRight: "8px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "200px",
                        border: "1px solid #e5e7eb",
                        zIndex: 1001,
                        padding: "4px 0"
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportProjectsModal(true);
                            setExportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: "#111827",
                            cursor: "pointer",
                            border: "none",
                            background: "none",
                            textAlign: "left"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                        >
                          Export Projects
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportProjectsModal(true);
                            setExportProjectsData({ ...exportProjectsData, module: "Project Tasks" });
                            setExportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: "#111827",
                            cursor: "pointer",
                            border: "none",
                            background: "none",
                            textAlign: "left"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                        >
                          Export Project Tasks
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportProjectsModal(true);
                            setExportProjectsData({ ...exportProjectsData, module: "Timesheet" });
                            setExportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: "#111827",
                            cursor: "pointer",
                            border: "none",
                            background: "none",
                            textAlign: "left"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                        >
                          Export Timesheet
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExportCurrentViewModal(true);
                            setExportSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            fontSize: "14px",
                            color: "#111827",
                            cursor: "pointer",
                            border: "none",
                            background: "none",
                            textAlign: "left"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#156372";
                            e.target.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                            e.target.style.color = "#111827";
                          }}
                        >
                          Export Current View
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preferences */}
                  <div style={{ position: "relative" }} ref={preferencesSubmenuRef}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const newState = !preferencesSubmenuOpen;
                        setPreferencesSubmenuOpen(newState);
                        if (newState) {
                          setSortSubmenuOpen(false);
                          setImportSubmenuOpen(false);
                          setExportSubmenuOpen(false);
                        }
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: preferencesSubmenuOpen ? "#156372" : "transparent",
                        color: preferencesSubmenuOpen ? "white" : ""
                      }}
                      onMouseEnter={(e) => {
                        if (!preferencesSubmenuOpen) {
                          e.currentTarget.style.backgroundColor = "#156372";
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.border = "1px solid #156372";
                          e.currentTarget.style.borderRadius = "4px";
                          e.currentTarget.style.margin = "2px 4px";
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) {
                            const paths = icon.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', 'white'));
                          }
                          const chevron = e.currentTarget.querySelector('svg:last-child');
                          if (chevron) {
                            const paths = chevron.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', 'white'));
                          }
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.color = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!preferencesSubmenuOpen) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "";
                          e.currentTarget.style.border = "none";
                          e.currentTarget.style.borderRadius = "0";
                          e.currentTarget.style.margin = "0";
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) {
                            const paths = icon.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', '#666'));
                          }
                          const chevron = e.currentTarget.querySelector('svg:last-child');
                          if (chevron) {
                            const paths = chevron.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', '#666'));
                          }
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.color = '#333';
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Settings size={16} style={{ color: preferencesSubmenuOpen ? "white" : "#666" }} />
                        <span style={{ fontSize: "14px", color: preferencesSubmenuOpen ? "white" : "#333" }}>Preferences</span>
                      </div>
                      <ChevronRight size={12} style={{ color: preferencesSubmenuOpen ? "white" : "#666" }} />
                    </div>
                    {preferencesSubmenuOpen && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        right: "100%",
                        marginRight: "8px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "200px",
                        border: "1px solid #e5e7eb",
                        zIndex: 1001,
                        padding: "4px 0"
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/settings/projects");
                            setPreferencesSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-sm text-left cursor-pointer border-none bg-transparent text-gray-900 hover:bg-[#156372] hover:text-white"
                        >
                          Project Preferences
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/settings/timesheet");
                            setPreferencesSubmenuOpen(false);
                            setShowMoreMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-sm text-left cursor-pointer border-none bg-transparent text-gray-900 hover:bg-[#156372] hover:text-white"
                        >
                          Timesheet Preferences
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Timer - Chrome Extension */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open("https://chrome.google.com/webstore", "_blank");
                      setShowMoreMenu(false);
                    }}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer group hover:bg-[#156372] hover:text-white hover:rounded hover:mx-1 hover:border-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[linear-gradient(135deg,#4285F4_0%,#34A853_25%,#FBBC05_50%,#EA4335_75%)]">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                      <span className="text-sm text-gray-800 group-hover:text-white">Timer - Chrome Extension</span>
                    </div>
                    <ChevronRight size={12} className="text-gray-500 group-hover:text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Header - Shows when items are selected */}
      {selectedProjects.length > 0 && (
        <div className="flex justify-between items-center px-6 py-3 bg-white border-b border-gray-200">
          {/* Left: Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedProjects.length === 0) {
                  alert("Please select at least one project to update.");
                  return;
                }
                setShowBulkUpdateModal(true);
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              Bulk Update
            </button>
            <button
              onClick={() => {
                navigate('/sales/invoices/new');
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              Create Invoice
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("active", "active")}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              Mark as Active
            </button>
            <button
              onClick={() => handleBulkStatusUpdate("on_hold", "inactive")}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              Mark as Inactive
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              Delete
            </button>
          </div>

          {/* Right: Selected Count and Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                {selectedProjects.length}
              </div>
              <span>Selected</span>
            </div>
            <button
              onClick={() => setSelectedProjects([])}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-transparent border border-gray-300 rounded-md cursor-pointer flex items-center gap-1 hover:bg-gray-50"
            >
              <span>Esc</span>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Projects Display */}
      <div style={{
        padding: "24px",
        backgroundColor: "#f5f5f5",
        minHeight: "calc(100vh - 60px)"
      }}>
        {/* Success Message */}
        {successMessage && (
          <div style={{
            marginBottom: "16px",
            padding: "12px 16px",
            backgroundColor: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            color: "#065f46"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#10b981" />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}
        {viewMode === "list" ? (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            overflow: "hidden"
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "white"
            }}>
              {selectedProjects.length === 0 && (
                <thead>
                  <tr style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb"
                  }}>
                    <th style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      width: "40px"
                    }}>
                    </th>
                    <th style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedProjects.length === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects(filteredAndSortedProjects.map(p => p.id));
                            } else {
                              setSelectedProjects([]);
                            }
                          }}
                          style={{
                            cursor: "pointer"
                          }}
                        />
                        CUSTOMER NAME
                      </div>
                    </th>
                    <th style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      PROJECT NAME
                    </th>
                    <th style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      BILLING METHOD
                    </th>
                    <th style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      RATE
                    </th>
                    <th style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      width: "40px"
                    }}>
                      <button
                        onClick={() => {
                          setSearchModalData(prev => ({
                            ...prev,
                            status: selectedView === "All" ? "All" : selectedView
                          }));
                          setIsSearchModalOpen(true);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Search size={16} style={{ color: "#6b7280" }} />
                      </button>
                    </th>
                  </tr>
                </thead>
              )}
              <tbody>
                {filteredAndSortedProjects.map((project) => (
                  <tr
                    key={project.id}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{
                      padding: "12px 16px",
                      fontSize: "14px"
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProjects([...selectedProjects, project.id]);
                          } else {
                            setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          cursor: "pointer"
                        }}
                      />
                    </td>
                    <td
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1f2937"
                      }}
                    >
                      {project.customerName || '--'}
                    </td>
                    <td
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      className="px-4 py-3 text-sm text-gray-800"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#156372] cursor-pointer">{project.projectName}</span>
                        <svg
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/time-tracking/projects/${project.id}/edit`);
                          }}
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="cursor-pointer opacity-60 hover:opacity-100"
                        >
                          <path d="M8 2L12 6M10.5 1.5L11.5 2.5L10.5 3.5L9.5 2.5L10.5 1.5ZM4 10L2 12L4 10ZM7 7L4 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M1 13L3 11L9 5L11 7L5 13H1V13Z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </td>
                    <td
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      className="px-4 py-3 text-sm text-gray-800"
                    >
                      {getBillingMethodText(project.billingMethod)}
                    </td>
                    <td
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      className="px-4 py-3 text-sm text-gray-800"
                    >
                      {project.billingRate !== undefined && project.billingRate !== null
                        ? project.billingRate
                        : (project.rate && project.rate !== '--' ? project.rate : '--')}
                    </td>
                    <td style={{
                      padding: "12px 16px"
                    }}>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-gray-500 text-sm">
                      No projects found. Click "+ New" to create your first project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
            {filteredAndSortedProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                {/* Project Name */}
                <div className="text-lg font-semibold text-[#156372] mb-2 text-center">
                  {project.projectName}
                </div>

                {/* Customer Name */}
                <div className="text-sm text-[#156372] mb-4 text-center">
                  {project.customerName}
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 mb-4"></div>

                {/* Logged Hours */}
                <div className="mb-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">
                    Logged Hours
                  </div>
                  <div className="text-base font-semibold text-[#1f2937]">
                    00:00
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 mb-4"></div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectForLog(project.projectName);
                      setShowLogEntryForm(true);
                    }}
                    className="flex-1 p-2.5 border border-gray-200 rounded bg-white cursor-pointer text-sm text-gray-800 hover:bg-gray-50"
                  >
                    Log Time
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to expense form with project name
                      navigate('/purchases/expenses/new', {
                        state: {
                          projectName: project.projectName || project.name,
                          customerName: project.customerName || project.customer || ''
                        }
                      });
                    }}
                    className="flex-1 p-2.5 border border-gray-200 rounded bg-white cursor-pointer text-sm text-gray-800 hover:bg-gray-50"
                  >
                    Create Expense
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full p-10 text-center text-gray-500 text-sm">
                No projects found. Click "+ New" to create your first project.
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Custom View Form Modal */}
      {showCustomViewForm && (
        <NewCustomViewForm onClose={() => setShowCustomViewForm(false)} />
      )}

      {/* New Log Entry Form Modal */}
      {showLogEntryForm && (
        <NewLogEntryForm
          onClose={() => {
            setShowLogEntryForm(false);
            setSelectedProjectForLog("");
          }}
          defaultProjectName={selectedProjectForLog}
        />
      )}

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        onClose={() => setShowBulkUpdateModal(false)}
        title="Bulk Update Projects"
        fieldOptions={projectFieldOptions}
        onUpdate={handleBulkUpdate}
        entityName="projects"
      />

      {/* Timer Modal - START TIMER */}
      {showTimerModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTimerModal(false);
            }
          }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-5"
        >
          <div className="bg-white rounded-lg w-full max-w-[500px] shadow-2xl p-6">
            {/* Header */}
            <div className="flex justify-center items-center mb-8 relative">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="9" stroke="#374151" strokeWidth="1.5" />
                  <path d="M10 6v4l3 2" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800 m-0">
                  START TIMER
                </h2>
              </div>
              <button
                onClick={() => setShowTimerModal(false)}
                className="absolute right-0 bg-transparent border-none text-2xl cursor-pointer text-gray-800 p-1 flex items-center justify-center w-8 h-8"
              >
                Ã—
              </button>
            </div>

            {/* Timer Display */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-gray-800 tracking-widest">
                {formatTime(elapsedTime)}
              </div>
            </div>

            {/* Associate Project Link */}
            {!showProjectFields && (
              <div className="mb-6">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowProjectFields(true);
                  }}
                  className="flex items-center gap-2 text-[#156372] no-underline text-sm cursor-pointer hover:no-underline"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 2l4 4-4 4M4 8h8" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Associate Project
                </a>
              </div>
            )}

            {/* Project Name Field - Show when Associate Project is clicked */}
            {showProjectFields && (
              <>
                <div className="mb-5">
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Project Name<span className="text-[#156372]">*</span>
                  </label>
                  <div className="relative" ref={projectDropdownRef}>
                    <select
                      value={selectedProjectForTimer}
                      onChange={(e) => {
                        setSelectedProjectForTimer(e.target.value);
                        setSelectedTaskForTimer(''); // Reset task when project changes
                        setShowProjectDropdown(false);
                      }}
                      onFocus={(e) => {
                        setShowProjectDropdown(true);
                        // e.target.style.borderColor = '#156372'; // Handled by focus: class
                      }}
                      className="w-full py-2.5 pl-3 pr-9 border border-gray-300 rounded-md text-sm outline-none appearance-none cursor-pointer bg-white focus:border-[#156372] hover:border-[#156372]"
                      onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.projectName}>
                          {project.projectName}
                        </option>
                      ))}
                    </select>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                    >
                      <path d="M3 4.5l3 3 3-3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Task Name Field */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    Task Name<span className="text-[#156372]">*</span>
                  </label>
                  <div className="relative">
                    {(() => {
                      const selectedProject = projects.find(p => p.projectName === selectedProjectForTimer);
                      const availableTasks = selectedProject?.tasks || [];

                      return (
                        <select
                          value={selectedTaskForTimer}
                          onChange={(e) => setSelectedTaskForTimer(e.target.value)}
                          disabled={!selectedProjectForTimer}
                          className={`w-full py-2.5 pl-3 pr-9 border border-gray-300 rounded-md text-sm outline-none appearance-none cursor-pointer focus:border-[#156372] hover:border-[#156372] ${selectedProjectForTimer ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                        >
                          <option value="">Select task</option>
                          {availableTasks.map((task, index) => (
                            <option key={index} value={task.taskName || ''}>
                              {task.taskName || 'Untitled Task'}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#6b7280'
                      }}
                    >
                      <path d="M3 4.5l3 3 3-3" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </>
            )}

            {/* Billable Checkbox */}
            <div className="mb-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="w-4.5 h-4.5 cursor-pointer accent-[#156372]"
                />
                <span className="text-sm text-gray-700">
                  Billable
                </span>
              </label>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Notes
              </label>
              <textarea
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                placeholder="Add notes"
                rows="4"
                className="w-full p-3 border border-gray-300 rounded-md text-sm outline-none resize-y font-inherit focus:border-[#156372]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleStartTimer}
                className="flex-1 px-6 py-3 bg-[#156372] text-white border-none rounded-md text-sm font-semibold cursor-pointer hover:bg-[#0D4A52]"
              >
                Start Timer
              </button>
              <button
                onClick={() => {
                  setShowTimerModal(false);
                  setTimerNotes('');
                  setSelectedProjectForTimer('');
                  setSelectedTaskForTimer('');
                  setIsBillable(true);
                  setShowProjectFields(false);
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => setShowPreferencesModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-[500px] w-[90%] max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Project Preferences
              </h2>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Default View
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="list">List View</option>
                <option value="card">Card View</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-200">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save preferences logic here
                  setShowPreferencesModal(false);
                }}
                className="px-4 py-2 bg-[#156372] text-white border-none rounded-md text-sm font-medium cursor-pointer hover:bg-[#0D4A52]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchModalOpen(false);
              setSearchModalData({
                projectName: "",
                customerName: "",
                billingMethod: "",
                status: "All"
              });
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[800px] mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 m-0">Search Projects</h2>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchModalData({
                    projectName: "",
                    customerName: "",
                    billingMethod: "",
                    status: "All"
                  });
                }}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Search Form */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                    <input
                      type="text"
                      value={searchModalData.projectName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                      placeholder="Enter project name"
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                    <input
                      type="text"
                      value={searchModalData.customerName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                      placeholder="Enter customer name"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4">
                  {/* Billing Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Method</label>
                    <input
                      type="text"
                      value={searchModalData.billingMethod}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, billingMethod: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                      placeholder="Enter billing method"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      value={searchModalData.status}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-md outline-none focus:border-[#156372]"
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setSearchModalData({
                      projectName: "",
                      customerName: "",
                      billingMethod: "",
                      status: "All"
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAppliedAdvancedSearch({ ...searchModalData });
                    if (searchModalData.status && searchModalData.status !== "All") {
                      setSelectedView(searchModalData.status);
                    }
                    setIsSearchModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#156372] border-none rounded-md cursor-pointer hover:bg-[#0D4A52]"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Current View Modal */}
      {showExportCurrentViewModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]"
          onClick={() => setShowExportCurrentViewModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-[600px] w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                Export Current View
              </h2>
              <button
                onClick={() => setShowExportCurrentViewModal(false)}
                className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Information Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6 flex items-start gap-3">
              <Info size={20} className="text-[#156372] shrink-0 mt-0.5" />
              <p className="m-0 text-sm text-blue-800 leading-normal">
                Only the current view with its visible columns will be exported from Taban Books in CSV or XLS format.
              </p>
            </div>

            {/* Decimal Format */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decimal Format <span className="text-red-500">*</span>
              </label>
              <select
                value={exportCurrentViewData.decimalFormat}
                onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, decimalFormat: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white cursor-pointer outline-none focus:border-[#156372]"
              >
                <option value="1234567.89">1234567.89</option>
                <option value="1,234,567.89">1,234,567.89</option>
                <option value="1234567,89">1234567,89</option>
                <option value="1.234.567,89">1.234.567,89</option>
              </select>
            </div>

            {/* Export File Format */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export File Format <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-3">
                <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-md border ${exportCurrentViewData.fileFormat === 'CSV' ? 'border-[#156372] bg-[#156372]/5' : 'border-gray-200 bg-transparent'}`}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="CSV"
                    checked={exportCurrentViewData.fileFormat === 'CSV'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    className="w-4.5 h-4.5 cursor-pointer accent-[#156372]"
                  />
                  <span className="text-sm text-gray-700">CSV (Comma Separated Value)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportCurrentViewData.fileFormat === 'XLS' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportCurrentViewData.fileFormat === 'XLS' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="XLS"
                    checked={exportCurrentViewData.fileFormat === 'XLS'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportCurrentViewData.fileFormat === 'XLSX' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportCurrentViewData.fileFormat === 'XLSX' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="XLSX"
                    checked={exportCurrentViewData.fileFormat === 'XLSX'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLSX (Microsoft Excel)</span>
                </label>
              </div>
            </div>

            {/* File Protection Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                File Protection Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={exportCurrentViewData.showPassword ? 'text' : 'password'}
                  value={exportCurrentViewData.password}
                  onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, password: e.target.value })}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#111827'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setExportCurrentViewData({ ...exportCurrentViewData, showPassword: !exportCurrentViewData.showPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {exportCurrentViewData.showPassword ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
              </p>
            </div>

            {/* Note */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.6'
              }}>
                <strong>Note:</strong> You can export only the first 10,000 rows. If you have more rows, please initiate a backup for the data in your Taban Books organization, and download it.{' '}
                <a href="#" style={{ color: '#156372', textDecoration: 'underline' }}>Backup Your Data</a>
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowExportCurrentViewModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportCurrentView(exportCurrentViewData.fileFormat.toLowerCase(), filteredAndSortedProjects);
                  setShowExportCurrentViewModal(false);
                  toast.success('Export started');
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Projects Modal */}
      {showExportProjectsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
          onClick={() => setShowExportProjectsModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Export Projects
              </h2>
              <button
                onClick={() => setShowExportProjectsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {/* Information Banner */}
            <div style={{
              backgroundColor: '#e0f2fe',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <Info size={20} color="#156372" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#1e40af',
                lineHeight: '1.5'
              }}>
                You can export your data from Taban Books in CSV, XLS or XLSX format.
              </p>
            </div>

            {/* Module */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Module <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={exportProjectsData.module}
                onChange={(e) => setExportProjectsData({ ...exportProjectsData, module: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="Projects">Projects</option>
                <option value="Project Tasks">Project Tasks</option>
                <option value="Timesheet">Timesheet</option>
              </select>
            </div>

            {/* Export Template */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Export Template <Info size={14} color="#6b7280" />
              </label>
              <select
                value={exportProjectsData.exportTemplate}
                onChange={(e) => setExportProjectsData({ ...exportProjectsData, exportTemplate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select an Export Template</option>
                <option value="template1">Template 1</option>
                <option value="template2">Template 2</option>
              </select>
            </div>

            {/* Decimal Format */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Decimal Format <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={exportProjectsData.decimalFormat}
                onChange={(e) => setExportProjectsData({ ...exportProjectsData, decimalFormat: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="1234567.89">1234567.89</option>
                <option value="1,234,567.89">1,234,567.89</option>
                <option value="1234567,89">1234567,89</option>
                <option value="1.234.567,89">1.234.567,89</option>
              </select>
            </div>

            {/* Export File Format */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Export File Format <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportProjectsData.fileFormat === 'CSV' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportProjectsData.fileFormat === 'CSV' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportProjectsFileFormat"
                    value="CSV"
                    checked={exportProjectsData.fileFormat === 'CSV'}
                    onChange={(e) => setExportProjectsData({ ...exportProjectsData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>CSV (Comma Separated Value)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportProjectsData.fileFormat === 'XLS' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportProjectsData.fileFormat === 'XLS' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportProjectsFileFormat"
                    value="XLS"
                    checked={exportProjectsData.fileFormat === 'XLS'}
                    onChange={(e) => setExportProjectsData({ ...exportProjectsData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLS (Microsoft Excel 1997-2004 Compatible)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '6px',
                  border: exportProjectsData.fileFormat === 'XLSX' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportProjectsData.fileFormat === 'XLSX' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportProjectsFileFormat"
                    value="XLSX"
                    checked={exportProjectsData.fileFormat === 'XLSX'}
                    onChange={(e) => setExportProjectsData({ ...exportProjectsData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#156372'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>XLSX (Microsoft Excel)</span>
                </label>
              </div>
            </div>

            {/* Include PII Checkbox */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={exportProjectsData.includePII}
                  onChange={(e) => setExportProjectsData({ ...exportProjectsData, includePII: e.target.checked })}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#156372'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  Include Sensitive Personally Identifiable Information (PII) while exporting.
                </span>
              </label>
            </div>

            {/* File Protection Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                File Protection Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={exportProjectsData.showPassword ? 'text' : 'password'}
                  value={exportProjectsData.password}
                  onChange={(e) => setExportProjectsData({ ...exportProjectsData, password: e.target.value })}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#111827'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setExportProjectsData({ ...exportProjectsData, showPassword: !exportProjectsData.showPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {exportProjectsData.showPassword ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
                </button>
              </div>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Your password must be at least 12 characters and include one uppercase letter, lowercase letter, number, and special character.
              </p>
            </div>

            {/* Note */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#374151',
                lineHeight: '1.6'
              }}>
                <strong>Note:</strong> You can export only the first 25,000 rows. If you have more rows, please initiate a backup for the data in your Taban Books organization, and download it.{' '}
                <a href="#" style={{ color: '#156372', textDecoration: 'underline' }}>Backup Your Data</a>
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowExportProjectsModal(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (exportProjectsData.module === "Project Tasks") {
                    exportTasks(exportProjectsData.fileFormat.toLowerCase(), projects);
                  } else if (exportProjectsData.module === "Timesheet") {
                    await exportTimesheets(exportProjectsData.fileFormat.toLowerCase());
                  } else {
                    exportProjects(exportProjectsData.fileFormat.toLowerCase(), projects);
                  }
                  setShowExportProjectsModal(false);
                  toast.success('Export started');
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



