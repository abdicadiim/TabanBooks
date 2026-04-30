import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Search, ArrowUpDown, ChevronRight, ChevronDown, Download, Upload, Settings, Eye, EyeOff, Info } from "lucide-react";
import { projectsAPI, timeEntriesAPI } from "../../services/api";
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

  // Handle bulk update
  const handleBulkUpdate = (field, value) => {
    if (selectedProjects.length === 0) {
      alert("Please select at least one project to update.");
      return;
    }

    const fieldLabel = projectFieldOptions.find(opt => opt.value === field)?.label || field;
    const updatedProjects = Array.isArray(projects) ? projects.map((project) => {
      if (selectedProjects.includes(project.id)) {
        return {
          ...project,
          [field]: value,
        };
      }
      return project;
    }) : [];

    setProjects(updatedProjects);
    localStorage.setItem("projects", JSON.stringify(updatedProjects));
    setSuccessMessage(`Successfully updated ${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''} - ${fieldLabel} set to "${value}".`);
    setTimeout(() => setSuccessMessage(""), 5000);
    setSelectedProjects([]);
    refreshProjects();
  };

  // Field options for bulk update
  const projectFieldOptions = [
    { value: "customerName", label: "Customer Name" },
    { value: "projectName", label: "Project Name" },
    { value: "billingMethod", label: "Billing Method" },
    { value: "rate", label: "Rate" },
    { value: "user", label: "User" },
    { value: "addToWatchlist", label: "Watchlist on my Dashboard" },
  ];

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
      // Filter by view
      if (selectedView === 'Active' && project.status !== 'Active') return false;
      if (selectedView === 'Inactive' && project.status !== 'Inactive') return false;

      // Filter by search term
      if (searchTerm) {
        return project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });

    return getSortedProjects(filtered);
  }, [projects, selectedView, searchTerm, selectedSort, sortDirection]);

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
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      position: "relative"
    }}>
      {/* Header */}
      {selectedProjects.length === 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: "56px", // Below TopBar (h-14 = 56px)
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          {/* Left: All Projects Dropdown */}
          <div
            ref={dropdownRef}
            style={{
              position: "relative"
            }}
          >
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <span style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937"
              }}>
                All Projects
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4.5l3 3 3-3" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "8px",
                backgroundColor: "#fff",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                minWidth: "200px",
                zIndex: 1000,
                padding: "8px 0"
              }}>
                {views.map((view) => (
                  <div
                    key={view.id}
                    onClick={() => handleViewSelect(view.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      cursor: "pointer",
                      backgroundColor: selectedView === view.id ? "rgba(21, 99, 114, 0.1)" : "transparent",
                      border: selectedView === view.id ? "1px solid #156372" : "1px solid transparent",
                      borderRadius: "4px",
                      margin: "0 8px 4px 8px"
                    }}
                    onMouseEnter={(e) => {
                      if (selectedView !== view.id) {
                        e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedView !== view.id) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span style={{
                      fontSize: "14px",
                      color: "#333"
                    }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    cursor: "pointer",
                    margin: "4px 8px 0 8px",
                    borderTop: "1px solid #e0e0e0",
                    paddingTop: "12px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3v10M3 8h10" stroke="#156372" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span style={{
                    fontSize: "14px",
                    color: "#156372",
                    fontWeight: "500"
                  }}>
                    New Custom View
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            paddingRight: "16px"
          }}>
            {/* View Toggle - Segmented Button */}
            <div style={{
              display: "flex",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              overflow: "hidden",
              backgroundColor: "#f9fafb"
            }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  backgroundColor: viewMode === 'list' ? "#fff" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#374151",
                  borderRight: "1px solid #e5e7eb"
                }}
              >
                ☰
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  backgroundColor: viewMode === 'grid' ? "#fff" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#374151"
                }}
              >
                ⊞
              </button>
            </div>

            {/* Timer Display - Show when timer is running or has elapsed time */}
            {(isTimerRunning || elapsedTime > 0) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                {/* Clock Icon with 'i' */}
                <div style={{
                  position: 'relative',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="9" stroke="#156372" strokeWidth="1.5" fill="#e3f2fd" />
                    <path d="M10 6v4l3 2" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{
                    position: 'absolute',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#156372',
                    top: '2px',
                    right: '2px'
                  }}>i</span>
                </div>

                {/* Time Display */}
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937',
                  fontFamily: 'monospace',
                  minWidth: '70px'
                }}>
                  {formatTimeShort(elapsedTime)}
                </span>

                {/* Pause Button */}
                <button
                  onClick={handlePauseTimer}
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#156372',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="2" width="2" height="8" fill="white" rx="0.5" />
                    <rect x="7" y="2" width="2" height="8" fill="white" rx="0.5" />
                  </svg>
                </button>

                {/* Stop Button */}
                <button
                  onClick={handleStopTimer}
                  style={{
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#156372',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
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
                      const svg = e.currentTarget.querySelector('svg path, svg rect');
                      if (svg) {
                        svg.setAttribute('stroke', 'white');
                        const paths = e.currentTarget.querySelectorAll('svg path');
                        paths.forEach(p => p.setAttribute('stroke', 'white'));
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#1f2937";
                      e.currentTarget.style.border = "none";
                      e.currentTarget.style.borderRadius = "0";
                      e.currentTarget.style.margin = "0";
                      const paths = e.currentTarget.querySelectorAll('svg path');
                      paths.forEach(p => p.setAttribute('stroke', '#1f2937'));
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 2V6M8 2V6M3 10H21" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>New Weekly Time Log</span>
                  </div>

                  {/* Timer - Chrome Extension */}
                  <div
                    onClick={() => {
                      setShowTimerModal(true);
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
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#1f2937";
                      e.currentTarget.style.border = "none";
                      e.currentTarget.style.borderRadius = "0";
                      e.currentTarget.style.margin = "0";
                    }}
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
              style={{
                position: "relative"
              }}
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
                style={{
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  padding: 0,
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                ⋯
              </button>

              {/* More Menu Dropdown */}
              {showMoreMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    backgroundColor: "#fff",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    minWidth: "220px",
                    zIndex: 1000,
                    border: "1px solid #e5e7eb",
                    padding: "4px 0"
                  }}>
                  {/* Sort by */}
                  <div style={{ position: "relative" }} ref={sortSubmenuRef}>
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
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: sortSubmenuOpen ? "#156372" : "transparent",
                        color: sortSubmenuOpen ? "white" : ""
                      }}
                      onMouseEnter={(e) => {
                        if (!sortSubmenuOpen) {
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
                        if (!sortSubmenuOpen) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "";
                          e.currentTarget.style.border = "none";
                          e.currentTarget.style.borderRadius = "0";
                          e.currentTarget.style.margin = "0";
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) {
                            const paths = icon.querySelectorAll('path, polyline, line');
                            paths.forEach(p => p.setAttribute('stroke', '#156372'));
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
                        <ArrowUpDown size={16} style={{ color: sortSubmenuOpen ? "white" : "#156372" }} />
                        <span style={{ fontSize: "14px", color: sortSubmenuOpen ? "white" : "#333" }}>Sort by</span>
                      </div>
                      <ChevronRight size={12} style={{ color: sortSubmenuOpen ? "white" : "#666" }} />
                    </div>
                    {sortSubmenuOpen && (
                      <div style={{
                        position: "absolute",
                        top: 0,
                        right: "100%",
                        marginRight: "8px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "180px",
                        border: "1px solid #e5e7eb",
                        zIndex: 1001,
                        padding: "4px 0"
                      }}>
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
                              style={{
                                width: "100%",
                                padding: "10px 16px",
                                fontSize: "14px",
                                color: "#111827",
                                cursor: "pointer",
                                border: "none",
                                background: isSelected ? "#e3f2fd" : "transparent",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.target.style.backgroundColor = "#156372";
                                  e.target.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.target.style.backgroundColor = "transparent";
                                  e.target.style.color = "#111827";
                                }
                              }}
                            >
                              <span>{option}</span>
                              {isSelected && (
                                <span style={{ fontSize: "12px", color: "#156372" }}>
                                  {sortDirection === "asc" ? "↑" : "↓"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Import */}
                  <div style={{ position: "relative" }} ref={importSubmenuRef}>
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
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: importSubmenuOpen ? "#156372" : "transparent",
                        color: importSubmenuOpen ? "white" : ""
                      }}
                      onMouseEnter={(e) => {
                        if (!importSubmenuOpen) {
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
                        if (!importSubmenuOpen) {
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
                        <Download size={16} style={{ color: importSubmenuOpen ? "white" : "#666" }} />
                        <span style={{ fontSize: "14px", color: importSubmenuOpen ? "white" : "#333" }}>Import</span>
                      </div>
                      <ChevronRight size={12} style={{ color: importSubmenuOpen ? "white" : "#666" }} />
                    </div>
                    {importSubmenuOpen && (
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
                            navigate("/time-tracking/projects/import");
                            setImportSubmenuOpen(false);
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
                          Import Projects
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/time-tracking/projects/import-tasks");
                            setImportSubmenuOpen(false);
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
                          Import Project Tasks
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/time-tracking/timesheet/import");
                            setImportSubmenuOpen(false);
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
                            // Navigate to Project Preferences settings page
                            navigate("/settings/projects");
                            setPreferencesSubmenuOpen(false);
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
                          Project Preferences
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to Timesheet Preferences settings page
                            navigate("/settings/timesheet");
                            setPreferencesSubmenuOpen(false);
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
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#156372";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.border = "1px solid #156372";
                      e.currentTarget.style.borderRadius = "4px";
                      e.currentTarget.style.margin = "2px 4px";
                      const chevron = e.currentTarget.querySelector('svg:last-child');
                      if (chevron) {
                        const paths = chevron.querySelectorAll('path, polyline, line');
                        paths.forEach(p => p.setAttribute('stroke', 'white'));
                      }
                      const span = e.currentTarget.querySelector('span');
                      if (span) span.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "";
                      e.currentTarget.style.border = "none";
                      e.currentTarget.style.borderRadius = "0";
                      e.currentTarget.style.margin = "0";
                      const chevron = e.currentTarget.querySelector('svg:last-child');
                      if (chevron) {
                        const paths = chevron.querySelectorAll('path, polyline, line');
                        paths.forEach(p => p.setAttribute('stroke', '#666'));
                      }
                      const span = e.currentTarget.querySelector('span');
                      if (span) span.style.color = '#333';
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4285F4 0%, #34A853 25%, #FBBC05 50%, #EA4335 75%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#fff"
                        }}></div>
                      </div>
                      <span style={{ fontSize: "14px", color: "#333" }}>Timer - Chrome Extension</span>
                    </div>
                    <ChevronRight size={12} style={{ color: "#666" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Header - Shows when items are selected */}
      {selectedProjects.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb"
        }}>
          {/* Left: Bulk Action Buttons */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <button
              onClick={() => {
                if (selectedProjects.length === 0) {
                  alert("Please select at least one project to update.");
                  return;
                }
                setShowBulkUpdateModal(true);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
            >
              Bulk Update
            </button>
            <button
              onClick={() => {
                navigate('/sales/invoices/new');
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
            >
              Create Invoice
            </button>
            <button
              onClick={() => {
                if (selectedProjects.length === 0) {
                  alert("Please select at least one project.");
                  return;
                }
                const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
                const updatedProjects = allProjects.map(project =>
                  selectedProjects.includes(project.id) ? { ...project, isActive: true } : project
                );
                localStorage.setItem('projects', JSON.stringify(updatedProjects));
                setProjects(updatedProjects);
                setSuccessMessage(`The selected Project${selectedProjects.length > 1 ? 's have' : ' has'} been marked as active.`);
                setTimeout(() => setSuccessMessage(""), 5000);
                setSelectedProjects([]);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
            >
              Mark as Active
            </button>
            <button
              onClick={() => {
                if (selectedProjects.length === 0) {
                  alert("Please select at least one project.");
                  return;
                }
                const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
                const updatedProjects = allProjects.map(project =>
                  selectedProjects.includes(project.id) ? { ...project, isActive: false } : project
                );
                localStorage.setItem('projects', JSON.stringify(updatedProjects));
                setProjects(updatedProjects);
                setSuccessMessage(`The selected Project${selectedProjects.length > 1 ? 's have' : ' has'} been marked as inactive.`);
                setTimeout(() => setSuccessMessage(""), 5000);
                setSelectedProjects([]);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
            >
              Mark as Inactive
            </button>
            <button
              onClick={() => {
                if (selectedProjects.length === 0) {
                  alert("Please select at least one project to delete.");
                  return;
                }

                const confirmMessage = `Are you sure you want to delete ${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''}? This action cannot be undone.`;
                if (!window.confirm(confirmMessage)) {
                  return;
                }

                const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
                const updatedProjects = allProjects.filter(project => !selectedProjects.includes(project.id));

                localStorage.setItem('projects', JSON.stringify(updatedProjects));
                setProjects(updatedProjects);
                setSuccessMessage(`Successfully deleted ${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''}.`);
                setTimeout(() => setSuccessMessage(""), 5000);
                setSelectedProjects([]);
              }}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
            >
              Delete
            </button>
          </div>

          {/* Right: Selected Count and Close */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#374151"
            }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {selectedProjects.length}
              </div>
              <span>Selected</span>
            </div>
            <button
              onClick={() => setSelectedProjects([])}
              style={{
                padding: "6px 12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
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
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      width: "40px"
                    }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", margin: "0 auto 6px" }}>
                        <path d="M3 4h10M5 8h6M6.5 12h3" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
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
                          cursor: "pointer",
                          accentColor: "#a855f7"
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
                        onClick={() => setIsSearchModalOpen(true)}
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
                      fontSize: "14px",
                      textAlign: "center"
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
                          cursor: "pointer",
                          accentColor: "#a855f7"
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
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1f2937"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span style={{
                          color: "#156372",
                          cursor: "pointer"
                        }}>{project.projectName}</span>
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
                          style={{
                            cursor: "pointer",
                            opacity: 0.6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.6";
                          }}
                        >
                          <path d="M8 2L12 6M10.5 1.5L11.5 2.5L10.5 3.5L9.5 2.5L10.5 1.5ZM4 10L2 12L4 10ZM7 7L4 10" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M1 13L3 11L9 5L11 7L5 13H1V13Z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </td>
                    <td
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1f2937"
                      }}
                    >
                      {getBillingMethodText(project.billingMethod)}
                    </td>
                    <td
                      onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1f2937"
                      }}
                    >
                      {project.rate && project.rate !== '--' ? project.rate : '--'}
                    </td>
                    <td style={{
                      padding: "12px 16px"
                    }}>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{
                      padding: "40px 16px",
                      textAlign: "center",
                      color: "#6b7280",
                      fontSize: "14px"
                    }}>
                      No projects found. Click "+ New" to create your first project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px"
          }}>
            {filteredAndSortedProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/time-tracking/projects/${project.id}`)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  padding: "20px",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "box-shadow 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }}
              >
                {/* Project Name */}
                <div style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#156372",
                  marginBottom: "8px",
                  textAlign: "center"
                }}>
                  {project.projectName}
                </div>

                {/* Customer Name */}
                <div style={{
                  fontSize: "14px",
                  color: "#156372",
                  marginBottom: "16px",
                  textAlign: "center"
                }}>
                  {project.customerName}
                </div>

                {/* Divider */}
                <div style={{
                  height: "1px",
                  backgroundColor: "#e5e7eb",
                  marginBottom: "16px"
                }}></div>

                {/* Logged Hours */}
                <div style={{
                  marginBottom: "16px",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: "12px",
                    color: "#666",
                    marginBottom: "4px"
                  }}>
                    Logged Hours
                  </div>
                  <div style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    00:00
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  height: "1px",
                  backgroundColor: "#e5e7eb",
                  marginBottom: "16px"
                }}></div>

                {/* Action Buttons */}
                <div style={{
                  display: "flex",
                  gap: "8px"
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectForLog(project.projectName);
                      setShowLogEntryForm(true);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#333"
                    }}
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
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#333"
                    }}
                  >
                    Create Expense
                  </button>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div style={{
                gridColumn: "1 / -1",
                padding: "40px",
                textAlign: "center",
                color: "#6b7280",
                fontSize: "14px"
              }}>
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
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '32px',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="10" r="9" stroke="#374151" strokeWidth="1.5" />
                  <path d="M10 6v4l3 2" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  START TIMER
                </h2>
              </div>
              <button
                onClick={() => setShowTimerModal(false)}
                style={{
                  position: 'absolute',
                  right: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#1f2937',
                  padding: '4px',
                  lineHeight: 1,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Timer Display */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#1f2937',
                letterSpacing: '2px'
              }}>
                {formatTime(elapsedTime)}
              </div>
            </div>

            {/* Associate Project Link */}
            {!showProjectFields && (
              <div style={{ marginBottom: '24px' }}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowProjectFields(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#156372',
                    textDecoration: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.textDecoration = 'none'}
                  onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
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
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    Project Name<span style={{ color: '#156372' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }} ref={projectDropdownRef}>
                    <select
                      value={selectedProjectForTimer}
                      onChange={(e) => {
                        setSelectedProjectForTimer(e.target.value);
                        setSelectedTaskForTimer(''); // Reset task when project changes
                        setShowProjectDropdown(false);
                      }}
                      onFocus={(e) => {
                        setShowProjectDropdown(true);
                        e.target.style.borderColor = '#156372';
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 36px 10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        appearance: 'none',
                        cursor: 'pointer',
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={(e) => e.target.style.borderColor = '#156372'}
                      onMouseLeave={(e) => e.target.style.borderColor = '#d1d5db'}
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

                {/* Task Name Field */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    display: 'block',
                    marginBottom: '6px'
                  }}>
                    Task Name<span style={{ color: '#156372' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    {(() => {
                      const selectedProject = projects.find(p => p.projectName === selectedProjectForTimer);
                      const availableTasks = selectedProject?.tasks || [];

                      return (
                        <select
                          value={selectedTaskForTimer}
                          onChange={(e) => setSelectedTaskForTimer(e.target.value)}
                          disabled={!selectedProjectForTimer}
                          style={{
                            width: '100%',
                            padding: '10px 36px 10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                            appearance: 'none',
                            cursor: selectedProjectForTimer ? 'pointer' : 'not-allowed',
                            backgroundColor: selectedProjectForTimer ? 'white' : '#f9fafb',
                            color: selectedProjectForTimer ? '#1f2937' : '#9ca3af'
                          }}
                          onFocus={(e) => {
                            if (selectedProjectForTimer) {
                              e.target.style.borderColor = '#156372';
                            }
                          }}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#a855f7'
                  }}
                />
                <span style={{
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Billable
                </span>
              </label>
            </div>

            {/* Notes Section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Notes
              </label>
              <textarea
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                placeholder="Add notes"
                rows="4"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#156372'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleStartTimer}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#156372',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#156372'}
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
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
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
          onClick={() => setShowPreferencesModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Project Preferences
              </h2>
              <button
                onClick={() => setShowPreferencesModal(false)}
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
                <X size={20} style={{ color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                display: 'block',
                marginBottom: '8px'
              }}>
                Default View
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="list">List View</option>
                <option value="card">Card View</option>
              </select>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowPreferencesModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save preferences logic here
                  setShowPreferencesModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#156372',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
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
          style={{
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
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '100%',
            maxWidth: '800px',
            margin: '0 16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>Search Projects</h2>
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
                <X size={20} style={{ color: '#6b7280' }} />
              </button>
            </div>

            {/* Search Form */}
            <div style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px'
              }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Project Name */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>Project Name</label>
                    <input
                      type="text"
                      value={searchModalData.projectName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, projectName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: '#1f2937',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                      placeholder="Enter project name"
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>Customer Name</label>
                    <input
                      type="text"
                      value={searchModalData.customerName}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, customerName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: '#1f2937',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                      placeholder="Enter customer name"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Billing Method */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>Billing Method</label>
                    <input
                      type="text"
                      value={searchModalData.billingMethod}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, billingMethod: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: '#1f2937',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                      placeholder="Enter billing method"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>Status</label>
                    <select
                      value={searchModalData.status}
                      onChange={(e) => setSearchModalData(prev => ({ ...prev, status: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: '#1f2937',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e7eb'
              }}>
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
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement search functionality
                    console.log("Search with:", searchModalData);
                    setIsSearchModalOpen(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: '#156372',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
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
          onClick={() => setShowExportCurrentViewModal(false)}
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
                Export Current View
              </h2>
              <button
                onClick={() => setShowExportCurrentViewModal(false)}
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
                Only the current view with its visible columns will be exported from Taban Books in CSV or XLS format.
              </p>
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
                value={exportCurrentViewData.decimalFormat}
                onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, decimalFormat: e.target.value })}
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
                  border: exportCurrentViewData.fileFormat === 'CSV' ? '2px solid #156372' : '1px solid #e5e7eb',
                  backgroundColor: exportCurrentViewData.fileFormat === 'CSV' ? 'rgba(21, 99, 114, 0.05)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="exportFileFormat"
                    value="CSV"
                    checked={exportCurrentViewData.fileFormat === 'CSV'}
                    onChange={(e) => setExportCurrentViewData({ ...exportCurrentViewData, fileFormat: e.target.value })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#a855f7'
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
                      accentColor: '#a855f7'
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
                      accentColor: '#a855f7'
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
                      accentColor: '#a855f7'
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
                      accentColor: '#a855f7'
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
                      accentColor: '#a855f7'
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
                      accentColor: '#a855f7'
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



