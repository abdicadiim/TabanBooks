import React, { useState, useEffect, useRef, useMemo } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { X, Search, ArrowUpDown, ChevronRight, Download, Upload, Settings, RefreshCw, Edit3, Eye, EyeOff, Info } from "lucide-react";
import { projectsAPI, timeEntriesAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import toast from "react-hot-toast";
import TimeTrackingProject from "./TimeTrackingProject";
import NewProjectForm from "./NewProjectForm";
import ProjectDetailPage from "./ProjectDetailPage";
import EditProjectForm from "./EditProjectForm";
import NewLogEntryForm from "./NewLogEntryForm";
import WeeklyTimeLog from "./WeeklyTimeLog";
import ImportProjects from "./ImportProjects";
import ImportTimesheets from "./ImportTimesheets";
import ImportProjectTasks from "./ImportProjectTasks";

function ProjectsTable() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden p-8 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th>Project Code</th>
            <th>Project Name</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan="2" className="text-center py-8 text-gray-500">
                No projects found
              </td>
            </tr>
          ) : (
            projects.map((p) => (
              <tr key={p.id || p._id}>
                <td>{p.projectNumber || p.id || p._id}</td>
                <td>{p.projectName || p.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Time Entries Page Component
function TimeEntriesPage() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoading(true);
      try {
        const response = await timeEntriesAPI.getAll();
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);

        const transformedEntries = data.map(entry => {
          // Extract user name as string (handle both object and string cases)
          const userName = typeof entry.user === 'object' && entry.user !== null
            ? (entry.user.name || entry.userName || '--')
            : (entry.userName || entry.user || '--');
          
          return {
            id: entry._id || entry.id,
            projectName: entry.project?.name || entry.projectName || '--',
            taskName: entry.task || entry.taskName || '--',
            date: entry.date ? new Date(entry.date).toLocaleDateString() : '--',
            timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '--',
            user: userName,
            billable: entry.billable !== undefined ? entry.billable : false,
            notes: entry.description || entry.notes || '--',
          };
        });

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error loading time entries:", error);
        toast.error("Failed to load time entries");
        setTimeEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeEntries();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shadow-md" style={{ background: "linear-gradient(90deg, #156372 0%, #0D4A52 100%)" }}>
        <h1 className="text-xl font-semibold m-0">
          Time Entries
        </h1>
        <button
          onClick={() => navigate('/time-tracking/timesheet')}
          className="px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer text-sm font-medium hover:bg-blue-600"
        >
          Back to Timesheet
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="text-center py-16 px-5">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading time entries...</p>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-16 px-5 text-gray-500">
            <p className="text-lg mb-2">No time entries found</p>
            <p className="text-sm">Create your first time entry to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Billable</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry) => (
                  <tr 
                    key={entry.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.projectName || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.taskName || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.timeSpent || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.user || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.billable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{entry.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TimesheetTable() {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [billingStatusExpanded, setBillingStatusExpanded] = useState(true);
  const [showCustomView, setShowCustomView] = useState(false);
  const [showLogEntryForm, setShowLogEntryForm] = useState(false);
  const [showNewLogEntryDropdown, setShowNewLogEntryDropdown] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [timerInterval, setTimerInterval] = useState(null);
  const [timerNotes, setTimerNotes] = useState('');
  const [associatedProject, setAssociatedProject] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProjectForTimer, setSelectedProjectForTimer] = useState('');
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [showProjectFields, setShowProjectFields] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null); // 'sort', 'import', 'export', 'preferences'
  const [hoveredEntryId, setHoveredEntryId] = useState(null);
  const [openDropdownEntryId, setOpenDropdownEntryId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);
  const [importSubmenuOpen, setImportSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [preferencesSubmenuOpen, setPreferencesSubmenuOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState('date'); // 'date', 'project', 'user', 'time'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [showExportCurrentViewModal, setShowExportCurrentViewModal] = useState(false);
  const [showExportProjectsModal, setShowExportProjectsModal] = useState(false);
  const [exportCurrentViewStep, setExportCurrentViewStep] = useState(1);
  const [exportProjectsStep, setExportProjectsStep] = useState(1);
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [statusSearch, setStatusSearch] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [periodSearch, setPeriodSearch] = useState('');
  const [criteria, setCriteria] = useState([{ id: 1, field: '', comparator: '', value: '' }]);
  const [selectedColumns, setSelectedColumns] = useState(['Project']);
  const [visibility, setVisibility] = useState('only-me');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('otherDetails'); // 'otherDetails' or 'comments'
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [editedEntryData, setEditedEntryData] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date()); // Current month/year for calendar
  const [selectedDateForLogEntry, setSelectedDateForLogEntry] = useState(null); // Selected date for new log entry
  const [selectedEntries, setSelectedEntries] = useState([]); // Selected time entries for bulk actions
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const periodDropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const newLogEntryDropdownRef = useRef(null);

  const availableColumns = ['Date', 'Customer', 'Task', 'User', 'Time', 'Billing Status'];

  // Log Entry Form State
  const [logEntryData, setLogEntryData] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    projectName: '',
    taskName: '',
    timeSpent: '',
    billable: true,
    user: '',
    notes: ''
  });

  // Filter selections state
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('');

  // Get projects from localStorage for dropdown
  const [projects, setProjects] = useState([]);
  
  // Load time entries from database (declare before useMemo that uses it)
  const [timeEntries, setTimeEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  
  // Extract unique customers from projects
  const customers = useMemo(() => {
    const customerSet = new Set();
    projects.forEach(project => {
      if (project.customerName) {
        customerSet.add(project.customerName);
      }
    });
    return Array.from(customerSet).map((name, index) => ({ id: index + 1, name }));
  }, [projects]);

  // Extract unique users from all projects and time entries
  const users = useMemo(() => {
    const userMap = new Map();
    
    // Add users from projects
    projects.forEach(project => {
      if (project.users && Array.isArray(project.users)) {
        project.users.forEach(user => {
          if (user.name && !userMap.has(user.name)) {
            userMap.set(user.name, { id: user.id || Date.now() + Math.random(), name: user.name, email: user.email || '' });
          }
        });
      }
    });
    
    // Add users from time entries
    timeEntries.forEach(entry => {
      const userName = entry.userName || entry.user || '';
      if (userName && userName !== '--' && !userMap.has(userName)) {
        userMap.set(userName, { 
          id: entry.userId || Date.now() + Math.random(), 
          name: userName, 
          email: '' 
        });
      }
    });
    
    return Array.from(userMap.values());
  }, [projects, timeEntries]);

  // Load comments when entry is selected
  useEffect(() => {
    if (selectedEntry) {
      const allComments = JSON.parse(localStorage.getItem('timesheetComments') || '{}');
      const entryComments = allComments[selectedEntry.id] || [];
      setComments(entryComments);
    } else {
      setComments([]);
    }
  }, [selectedEntry]);

  // Load projects from database
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
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

    fetchProjects();

    // Listen for custom events (when projects are updated from other components)
    const handleProjectUpdate = () => {
      fetchProjects();
    };
    window.addEventListener('projectUpdated', handleProjectUpdate);
    
    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
    };
  }, []);
  
  // Get tasks from selected project
  const selectedProject = projects.find(p => p.projectName === logEntryData.projectName);
  const availableTasks = selectedProject?.tasks || [];

  // Load entries on mount and when needed
  useEffect(() => {
    const fetchTimeEntries = async () => {
      setLoadingEntries(true);
      try {
        const response = await timeEntriesAPI.getAll();
        // Handle response format: { success: true, data: [...] } or direct array
        const data = Array.isArray(response)
          ? response
          : (response?.data || []);

        // Transform database entries to match frontend format
        const transformedEntries = data.map(entry => {
          // Extract user name as string (handle both object and string cases)
          const userName = typeof entry.user === 'object' && entry.user !== null
            ? (entry.user.name || '--')
            : (entry.userName || entry.user || '--');
          
          return {
            id: entry._id || entry.id,
            projectId: entry.project?._id || entry.projectId,
            projectName: entry.project?.name || entry.projectName,
            projectNumber: entry.project?.projectNumber || entry.projectNumber,
            userId: entry.user?._id || entry.userId,
            userName: userName,
            user: userName, // Ensure user is always a string
            date: entry.date ? new Date(entry.date).toLocaleDateString() : new Date().toLocaleDateString(),
            hours: entry.hours || 0,
            minutes: entry.minutes || 0,
            timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
            description: entry.description || '',
            task: entry.task || entry.taskName || '',
            taskName: entry.task || entry.taskName || '',
            billable: entry.billable !== undefined ? entry.billable : true,
            billingRate: entry.billingRate || 0,
            notes: entry.description || entry.notes || '',
            billingStatus: entry.billingStatus || 'Unbilled',
            // Don't spread entry to avoid overwriting our transformed fields
          };
        });

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error loading time entries:", error);
        toast.error("Failed to load time entries: " + (error.message || "Unknown error"));
        setTimeEntries([]);
      } finally {
        setLoadingEntries(false);
      }
    };

    fetchTimeEntries();

    // Listen for custom events (when entries are updated from other components)
    const handleTimeEntryUpdate = () => {
      fetchTimeEntries();
    };
    window.addEventListener('timeEntryUpdated', handleTimeEntryUpdate);
    
    return () => {
      window.removeEventListener('timeEntryUpdated', handleTimeEntryUpdate);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
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
          setHoveredMenu(null);
        }
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) {
        setShowMoreDropdown(false);
      }
      if (newLogEntryDropdownRef.current && !newLogEntryDropdownRef.current.contains(event.target)) {
        setShowNewLogEntryDropdown(false);
      }
      // Close row dropdown when clicking outside (will be handled by checking if click target is inside dropdown)
      if (openDropdownEntryId) {
        const dropdownElement = document.querySelector(`[data-dropdown-entry-id="${openDropdownEntryId}"]`);
        if (dropdownElement && !dropdownElement.contains(event.target)) {
          setOpenDropdownEntryId(null);
        }
      }
    }

    if (showDropdown || showMoreMenu || showMoreDropdown || showNewLogEntryDropdown || openDropdownEntryId || sortSubmenuOpen || importSubmenuOpen || exportSubmenuOpen || preferencesSubmenuOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showMoreMenu, showMoreDropdown, showNewLogEntryDropdown, openDropdownEntryId, sortSubmenuOpen, importSubmenuOpen, exportSubmenuOpen, preferencesSubmenuOpen]);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('timerState');
    if (savedTimerState) {
      const timerState = JSON.parse(savedTimerState);
      setElapsedTime(timerState.elapsedTime || 0);
      setIsTimerRunning(timerState.isTimerRunning || false);
      setTimerNotes(timerState.timerNotes || '');
      setAssociatedProject(timerState.associatedProject || '');
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    const timerState = {
      elapsedTime,
      isTimerRunning,
      timerNotes,
      associatedProject,
      lastUpdated: Date.now()
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));
  }, [elapsedTime, isTimerRunning, timerNotes, associatedProject]);

  // Listen for storage changes (when timer is updated from other page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'timerState' && e.newValue) {
        const timerState = JSON.parse(e.newValue);
        setElapsedTime(timerState.elapsedTime || 0);
        setIsTimerRunning(timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setAssociatedProject(timerState.associatedProject || '');
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = () => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        setElapsedTime(timerState.elapsedTime || 0);
        setIsTimerRunning(timerState.isTimerRunning || false);
        setTimerNotes(timerState.timerNotes || '');
        setAssociatedProject(timerState.associatedProject || '');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timerStateUpdated', handleCustomStorage);
    
    // Poll for changes (for same-tab updates)
    const pollInterval = setInterval(() => {
      const savedTimerState = localStorage.getItem('timerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        if (timerState.lastUpdated && timerState.lastUpdated > (Date.now() - 2000)) {
          setElapsedTime(timerState.elapsedTime || 0);
          setIsTimerRunning(timerState.isTimerRunning || false);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timerStateUpdated', handleCustomStorage);
      clearInterval(pollInterval);
    };
  }, []);

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 1;
          // Update localStorage on each tick
          const timerState = {
            elapsedTime: newTime,
            isTimerRunning: true,
            timerNotes,
            associatedProject,
            lastUpdated: Date.now()
          };
          localStorage.setItem('timerState', JSON.stringify(timerState));
          window.dispatchEvent(new CustomEvent('timerStateUpdated'));
          return newTime;
        });
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
  }, [isTimerRunning, timerNotes, associatedProject]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
  };

  // Format time as HH:MM for display in timer controls
  const formatTimeShort = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
    const timerState = {
      elapsedTime,
      isTimerRunning: false,
      timerNotes,
      associatedProject,
      lastUpdated: Date.now()
    };
    localStorage.setItem('timerState', JSON.stringify(timerState));
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleStopTimer = async () => {
    setIsTimerRunning(false);
    // Save the time entry
    if (elapsedTime > 0 && associatedProject) {
      try {
        // Find project
        const projectObj = projects.find(p => p.projectName === associatedProject);
        if (!projectObj) {
          toast.error('Invalid project selected');
          return;
        }

        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
          toast.error('User not found. Please log in again.');
          return;
        }

        // Parse time (formatTimeShort returns "Xh Ym" format)
        const timeStr = formatTimeShort(elapsedTime);
        const hoursMatch = timeStr.match(/(\d+)h/);
        const minutesMatch = timeStr.match(/(\d+)m/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

        // Create time entry
      const newEntry = {
          project: projectObj.id,
          user: currentUser.id,
          date: new Date().toISOString(),
          hours: hours,
          minutes: minutes,
          description: timerNotes || '',
        billable: true,
          task: '',
      };

        await timeEntriesAPI.create(newEntry);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
      
        // Show success message
        toast.success('Time entry saved successfully!');
      } catch (error) {
        console.error("Error saving timer entry:", error);
        toast.error("Failed to save time entry");
      }
    }
    // Reset timer
    setElapsedTime(0);
    setTimerNotes('');
    setAssociatedProject('');
    setShowTimerModal(false);
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  const handleDeleteTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setTimerNotes('');
    setAssociatedProject('');
    // Clear from localStorage
    localStorage.removeItem('timerState');
    window.dispatchEvent(new CustomEvent('timerStateUpdated'));
  };

  // Sort options for timesheet entries
  const sortOptions = ['Date', 'Project Name', 'User', 'Time'];

  // Sorting function
  const getSortedEntries = (entries) => {
    const sorted = [...entries];
    
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      switch (selectedSort) {
        case 'date':
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case 'project':
          aValue = (a.projectName || "").toLowerCase();
          bValue = (b.projectName || "").toLowerCase();
          break;
        case 'user':
          aValue = (a.user || "").toLowerCase();
          bValue = (b.user || "").toLowerCase();
          break;
        case 'time':
          // Parse time strings like "2h 30m" to minutes
          const parseTime = (timeStr) => {
            if (!timeStr) return 0;
            const hours = (timeStr.match(/(\d+)h/) || [0, 0])[1];
            const minutes = (timeStr.match(/(\d+)m/) || [0, 0])[1];
            return parseInt(hours) * 60 + parseInt(minutes);
          };
          aValue = parseTime(a.timeSpent);
          bValue = parseTime(b.timeSpent);
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

  // Filter entries based on selected filters
  const getFilteredEntries = (entries) => {
    let filtered = [...entries];

    // Period filter
    if (selectedPeriod && selectedPeriod !== 'All') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(entry => {
        if (!entry.date) return false;
        
        try {
          const entryDate = new Date(entry.date);
          if (isNaN(entryDate.getTime())) return false;
          
          const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          
          switch (selectedPeriod) {
            case 'Today':
              return entryDateOnly.getTime() === today.getTime();
            
            case 'Yesterday': {
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              return entryDateOnly.getTime() === yesterday.getTime();
            }
            
            case 'This Week': {
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() - today.getDay()); // Sunday
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              return entryDateOnly >= weekStart && entryDateOnly <= weekEnd;
            }
            
            case 'This Month':
              return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
            
            case 'This Quarter': {
              const quarter = Math.floor(now.getMonth() / 3);
              const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
              const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
              return entryDateOnly >= quarterStart && entryDateOnly <= quarterEnd;
            }
            
            case 'This Year':
              return entryDate.getFullYear() === now.getFullYear();
            
            case 'Previous Week': {
              const prevWeekStart = new Date(today);
              prevWeekStart.setDate(today.getDate() - today.getDay() - 7);
              const prevWeekEnd = new Date(prevWeekStart);
              prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
              return entryDateOnly >= prevWeekStart && entryDateOnly <= prevWeekEnd;
            }
            
            case 'Previous Month': {
              const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
              return entryDateOnly >= prevMonth && entryDateOnly <= prevMonthEnd;
            }
            
            case 'Previous Quarter': {
              const quarter = Math.floor(now.getMonth() / 3);
              const prevQuarter = quarter === 0 ? 3 : quarter - 1;
              const prevQuarterYear = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
              const prevQuarterStart = new Date(prevQuarterYear, prevQuarter * 3, 1);
              const prevQuarterEnd = new Date(prevQuarterYear, (prevQuarter + 1) * 3, 0);
              return entryDateOnly >= prevQuarterStart && entryDateOnly <= prevQuarterEnd;
            }
            
            case 'Previous Year':
              return entryDate.getFullYear() === now.getFullYear() - 1;
            
            default:
              return true;
          }
        } catch (e) {
          console.error('Date parsing error in filter:', e);
          return false;
        }
      });
    }

    // Customer filter
    if (selectedCustomer) {
      filtered = filtered.filter(entry => {
        const project = projects.find(p => p.projectName === entry.projectName);
        return project?.customerName === selectedCustomer;
      });
    }

    // Project filter
    if (selectedProjectFilter) {
      filtered = filtered.filter(entry => entry.projectName === selectedProjectFilter);
    }

    // User filter
    if (selectedUserFilter) {
      filtered = filtered.filter(entry => {
        const userName = entry.userName || entry.user || '';
        return userName === selectedUserFilter;
      });
    }

    return filtered;
  };

  // Get sorted entries (memoized)
  const sortedEntries = useMemo(() => {
    const filtered = getFilteredEntries(timeEntries);
    return getSortedEntries(filtered);
  }, [timeEntries, selectedSort, sortDirection, selectedPeriod, selectedCustomer, selectedProjectFilter, selectedUserFilter, projects]);

  // Handle sort selection
  const handleSortSelect = (sortOption) => {
    const sortMap = {
      'Date': 'date',
      'Project Name': 'project',
      'User': 'user',
      'Time': 'time'
    };
    const sortKey = sortMap[sortOption] || 'date';
    
    if (selectedSort === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSelectedSort(sortKey);
      setSortDirection('desc');
    }
    setSortSubmenuOpen(false);
  };

  // Export function
  const exportTimesheets = (format, entriesToExport) => {
    const exportData = entriesToExport.slice(0, 25000);
    
    if (format === "csv") {
      const headers = ["Date", "Project Name", "Task", "Time", "User", "Billable", "Notes"];
      
      let csvContent = headers.join(",") + "\n";
      
      exportData.forEach((entry) => {
        const row = [
          `"${(entry.date || "").replace(/"/g, '""')}"`,
          `"${(entry.projectName || "").replace(/"/g, '""')}"`,
          `"${(entry.taskName || "").replace(/"/g, '""')}"`,
          `"${(entry.timeSpent || "").replace(/"/g, '""')}"`,
          `"${(entry.user || "").replace(/"/g, '""')}"`,
          entry.billable ? "Yes" : "No",
          `"${(entry.notes || "").replace(/"/g, '""')}"`,
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
    } else if (format === "json") {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `timesheets_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      {selectedEntries.length === 0 && (
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
        {/* Left: All Timesheets Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>All Timesheets</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4.5l3 3 3-3" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          {/* Dropdown Menu */}
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '8px',
              backgroundColor: 'white',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '280px',
              zIndex: 1000,
              padding: '8px 0',
              border: '1px solid #e5e7eb'
            }}>
              {/* ALL Section */}
              <div style={{ padding: '4px 0' }}>
                <div style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>ALL</span>
                  <span style={{
                    backgroundColor: '#156372',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>1</span>
                </div>
                <div style={{
                  padding: '8px 16px 8px 32px',
                  fontSize: '14px',
                  color: '#1f2937',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  All
                </div>
              </div>

              {/* BILLING STATUS Section */}
              <div style={{ padding: '4px 0', borderTop: '1px solid #e5e7eb' }}>
                <div 
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => setBillingStatusExpanded(!billingStatusExpanded)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px' }}>{billingStatusExpanded ? 'â–¼' : 'â–¶'}</span>
                    <span>BILLING STATUS</span>
                  </div>
                  <span style={{
                    backgroundColor: '#156372',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>4</span>
                </div>
                {billingStatusExpanded && (
                  <div>
                    <div style={{
                      padding: '8px 16px 8px 40px',
                      fontSize: '14px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Non-Billable
                    </div>
                    <div style={{
                      padding: '8px 16px 8px 40px',
                      fontSize: '14px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Billable
                    </div>
                    <div style={{
                      padding: '8px 16px 8px 40px',
                      fontSize: '14px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Yet to Invoice
                    </div>
                    <div style={{
                      padding: '8px 16px 8px 40px',
                      fontSize: '14px',
                      color: '#1f2937',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      Invoiced
                    </div>
                  </div>
                )}
              </div>

              {/* New Custom View */}
              <div style={{ 
                padding: '4px 0', 
                borderTop: '1px solid #e5e7eb',
                marginTop: '4px'
              }}>
                <div style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: '#156372',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => {
                  setShowCustomView(true);
                  setShowDropdown(false);
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontSize: '16px' }}>+</span>
                  <span>New Custom View</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Summary Button */}
          <button style={{
            backgroundColor: 'transparent',
            color: '#156372',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12h10M3 8h10M3 4h10" stroke="#156372" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="3" y="2" width="2" height="4" fill="#156372" />
                <rect x="3" y="6" width="2" height="4" fill="#3b82f6" />
                <rect x="3" y="10" width="2" height="4" fill="#3b82f6" />
            </svg>
            Summary
          </button>

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
              â˜°
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: "6px 12px",
                border: "none",
                backgroundColor: viewMode === 'calendar' ? "#fff" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: "#374151"
              }}
            >
              ðŸ“…
            </button>
          </div>

          {/* Timer Display - Show when timer is running or has elapsed time */}
          {(isTimerRunning || elapsedTime > 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              {/* Clock Icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <circle cx="9" cy="9" r="8" stroke="#374151" strokeWidth="1.5" />
                  <path d="M9 5v4l3 2" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              {/* Time Display */}
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                fontFamily: 'monospace',
                minWidth: '75px',
                letterSpacing: '0.5px'
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
                  padding: 0,
                  flexShrink: 0
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
                  padding: 0,
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0D4A52'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#156372'}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2.5" y="2.5" width="7" height="7" fill="white" rx="1" />
                </svg>
              </button>

              {/* Trash/Delete Button */}
              <button
                onClick={handleDeleteTimer}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0
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
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5 4.5V3.5C5.5 2.95 5.95 2.5 6.5 2.5H9.5C10.05 2.5 10.5 2.95 10.5 3.5V4.5M3.5 4.5H12.5M4.5 4.5V13C4.5 13.55 4.95 14 5.5 14H10.5C11.05 14 11.5 13.55 11.5 13V4.5M6.5 7V11.5M9.5 7V11.5" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
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

          {/* New Log Entry Button with Dropdown */}
          <div 
            ref={newLogEntryDropdownRef}
            style={{
              position: 'relative',
              display: 'flex',
                alignItems: 'center',
                overflow: 'visible',
                zIndex: 101
            }}
          >
            <button 
              onClick={() => setShowLogEntryForm(true)}
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
              New Log Entry
            </button>
            <button
              onClick={() => setShowNewLogEntryDropdown(!showNewLogEntryDropdown)}
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4.5l3 3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showNewLogEntryDropdown && (
              <div style={{
                position: 'absolute',
                  top: 'calc(100% + 4px)',
                right: 0,
                backgroundColor: 'white',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '220px',
                  width: 'max-content',
                  maxWidth: '280px',
                  zIndex: 10000,
                border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  isolation: 'isolate'
              }}>
                <button
                  onClick={() => {
                    setShowNewLogEntryDropdown(false);
                    navigate('/time-tracking/timesheet/weekly');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    color: '#1f2937',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  New Week
                </button>

                <button
                  onClick={() => {
                    setShowLogEntryForm(true);
                    setShowNewLogEntryDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: '#1e40af',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
                >
                  New Log Entry
                </button>

                <button
                  onClick={() => {
                    // Handle "Timer - Chrome Extension" option
                    setShowNewLogEntryDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    color: '#1f2937',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderTop: '1px solid #e5e7eb'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="9" fill="#4285F4" />
                      <circle cx="10" cy="10" r="7" fill="#34A853" />
                      <circle cx="10" cy="10" r="5" fill="#FBBC04" />
                      <circle cx="10" cy="10" r="3" fill="#EA4335" />
                  </svg>
                  Timer - Chrome Extension
                </button>
              </div>
            )}
          </div>
          
          {/* Three Dots Menu */}
          <div 
            ref={moreMenuRef}
            style={{
              position: "relative"
            }}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu(!showMoreMenu);
                if (showMoreMenu) {
                  setHoveredMenu(null);
                  setSortSubmenuOpen(false);
                    setImportSubmenuOpen(false);
                  setExportSubmenuOpen(false);
                    setPreferencesSubmenuOpen(false);
                }
              }}
              style={{
                width: "32px",
                height: "32px",
                cursor: "pointer",
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#374151",
                padding: 0
              }}
            >
              â‹¯
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
                      setSortSubmenuOpen(!sortSubmenuOpen);
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
                          paths.forEach(p => p.setAttribute('stroke', '#1976d2'));
                        }
                        const chevron = e.currentTarget.querySelector('svg:last-child');
                        if (chevron) {
                          const paths = chevron.querySelectorAll('path, polyline, line');
                          paths.forEach(p => p.setAttribute('stroke', '#666'));
                        }
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
                          'Date': 'date',
                          'Project Name': 'project',
                          'User': 'user',
                          'Time': 'time'
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
                                background: isSelected ? "rgba(21, 99, 114, 0.1)" : "transparent",
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
                            setExportProjectsData({ ...exportProjectsData, module: "Projects" });
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
      {selectedEntries.length > 0 && (
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
              onClick={async () => {
              if (selectedEntries.length === 0) {
                  toast.error("Please select at least one entry.");
                return;
              }
                try {
                  // Update each selected entry via API
                  await Promise.all(selectedEntries.map(entryId => {
                    const entry = timeEntries.find(e => e.id === entryId);
                    if (entry) {
                      return timeEntriesAPI.update(entryId, { billingStatus: 'Invoiced' });
                    }
                    return Promise.resolve();
                  }));
                  
                  // Refresh entries
                  const response = await timeEntriesAPI.getAll();
                  const data = Array.isArray(response) ? response : (response?.data || []);
                  const transformedEntries = data.map(entry => {
                    const userName = typeof entry.user === 'object' && entry.user !== null
                      ? (entry.user.name || '--')
                      : (entry.userName || entry.user || '--');
                    
                    return {
                      id: entry._id || entry.id,
                      projectId: entry.project?._id || entry.projectId,
                      projectName: entry.project?.name || entry.projectName,
                      projectNumber: entry.project?.projectNumber || entry.projectNumber,
                      userId: entry.user?._id || entry.userId,
                      userName: userName,
                      user: userName,
                      date: entry.date ? new Date(entry.date).toLocaleDateString() : new Date().toLocaleDateString(),
                      hours: entry.hours || 0,
                      minutes: entry.minutes || 0,
                      timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
                      description: entry.description || '',
                      task: entry.task || entry.taskName || '',
                      taskName: entry.task || entry.taskName || '',
                      billable: entry.billable !== undefined ? entry.billable : true,
                      billingRate: entry.billingRate || 0,
                      notes: entry.description || entry.notes || '',
                      billingStatus: entry.billingStatus || 'Unbilled',
                    };
                  });
                  setTimeEntries(transformedEntries);
              setSelectedEntries([]);
                  toast.success(`Successfully marked ${selectedEntries.length} entr${selectedEntries.length > 1 ? 'ies' : 'y'} as invoiced.`);
                } catch (error) {
                  console.error("Error updating entries:", error);
                  toast.error("Failed to update entries");
                }
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
            Mark as Invoiced
          </button>
          <button
              onClick={async () => {
              if (selectedEntries.length === 0) {
                  toast.error("Please select at least one entry.");
                return;
              }
                try {
                  // Update each selected entry via API
                  await Promise.all(selectedEntries.map(entryId => {
                    const entry = timeEntries.find(e => e.id === entryId);
                    if (entry) {
                      return timeEntriesAPI.update(entryId, { billingStatus: 'Unbilled' });
                    }
                    return Promise.resolve();
                  }));
                  
                  // Refresh entries
                  const response = await timeEntriesAPI.getAll();
                  const data = Array.isArray(response) ? response : (response?.data || []);
                  const transformedEntries = data.map(entry => {
                    const userName = typeof entry.user === 'object' && entry.user !== null
                      ? (entry.user.name || '--')
                      : (entry.userName || entry.user || '--');
                    
                    return {
                      id: entry._id || entry.id,
                      projectId: entry.project?._id || entry.projectId,
                      projectName: entry.project?.name || entry.projectName,
                      projectNumber: entry.project?.projectNumber || entry.projectNumber,
                      userId: entry.user?._id || entry.userId,
                      userName: userName,
                      user: userName,
                      date: entry.date ? new Date(entry.date).toLocaleDateString() : new Date().toLocaleDateString(),
                      hours: entry.hours || 0,
                      minutes: entry.minutes || 0,
                      timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
                      description: entry.description || '',
                      task: entry.task || entry.taskName || '',
                      taskName: entry.task || entry.taskName || '',
                      billable: entry.billable !== undefined ? entry.billable : true,
                      billingRate: entry.billingRate || 0,
                      notes: entry.description || entry.notes || '',
                      billingStatus: entry.billingStatus || 'Unbilled',
                    };
                  });
                  setTimeEntries(transformedEntries);
              setSelectedEntries([]);
                  toast.success(`Successfully marked ${selectedEntries.length} entr${selectedEntries.length > 1 ? 'ies' : 'y'} as unbilled.`);
                } catch (error) {
                  console.error("Error updating entries:", error);
                  toast.error("Failed to update entries");
                }
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
            Mark as Unbilled
          </button>
          <button
              onClick={async () => {
              if (selectedEntries.length === 0) {
                  toast.error("Please select at least one entry to delete.");
                return;
              }
              
              const confirmMessage = `Are you sure you want to delete ${selectedEntries.length} entr${selectedEntries.length > 1 ? 'ies' : 'y'}? This action cannot be undone.`;
              if (!window.confirm(confirmMessage)) {
                return;
              }
              
                try {
                  // Delete each selected entry via API
                  await Promise.all(selectedEntries.map(entryId => 
                    timeEntriesAPI.delete(entryId)
                  ));
                  
                  // Refresh entries
                  const response = await timeEntriesAPI.getAll();
                  const data = Array.isArray(response) ? response : (response?.data || []);
                  const transformedEntries = data.map(entry => {
                    const userName = typeof entry.user === 'object' && entry.user !== null
                      ? (entry.user.name || '--')
                      : (entry.userName || entry.user || '--');
                    
                    return {
                      id: entry._id || entry.id,
                      projectId: entry.project?._id || entry.projectId,
                      projectName: entry.project?.name || entry.projectName,
                      projectNumber: entry.project?.projectNumber || entry.projectNumber,
                      userId: entry.user?._id || entry.userId,
                      userName: userName,
                      user: userName,
                      date: entry.date ? new Date(entry.date).toLocaleDateString() : new Date().toLocaleDateString(),
                      hours: entry.hours || 0,
                      minutes: entry.minutes || 0,
                      timeSpent: entry.hours ? `${entry.hours}h ${entry.minutes || 0}m` : '0h',
                      description: entry.description || '',
                      task: entry.task || entry.taskName || '',
                      taskName: entry.task || entry.taskName || '',
                      billable: entry.billable !== undefined ? entry.billable : true,
                      billingRate: entry.billingRate || 0,
                      notes: entry.description || entry.notes || '',
                      billingStatus: entry.billingStatus || 'Unbilled',
                    };
                  });
                  setTimeEntries(transformedEntries);
              setSelectedEntries([]);
                  toast.success(`Successfully deleted ${selectedEntries.length} entr${selectedEntries.length > 1 ? 'ies' : 'y'}.`);
                  window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                } catch (error) {
                  console.error("Error deleting entries:", error);
                  toast.error("Failed to delete entries");
                }
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
              {selectedEntries.length}
            </div>
            <span>Selected</span>
          </div>
          <button
            onClick={() => setSelectedEntries([])}
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

      {/* Filter Bar */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '12px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: '112px', // Below TopBar (56px) + Header (56px) = 112px
        zIndex: 99
      }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>VIEW BY:</span>
        <div style={{ position: 'relative' }} ref={periodDropdownRef}>
          <div
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            style={{
              border: '1px solid #d1d5db',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '120px'
            }}
          >
            <span>Period: {selectedPeriod}</span>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>
              {showPeriodDropdown ? 'â–²' : 'â–¼'}
            </span>
          </div>

          {/* Period Dropdown */}
          {showPeriodDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: 'white',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '220px',
              maxHeight: '400px',
              zIndex: 1000,
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              {/* Search Bar */}
              <div style={{
                padding: '8px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={periodSearch}
                    onChange={(e) => setPeriodSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 32px 8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '16px'
                  }}>ðŸ”</span>
                </div>
              </div>

              {/* Period Options */}
              <div style={{
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '4px 0'
              }}>
                {/* All Option */}
                <div
                  onClick={() => {
                    setSelectedPeriod('All');
                    setShowPeriodDropdown(false);
                    setPeriodSearch('');
                  }}
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                    color: '#1f2937',
                    cursor: 'pointer',
                    backgroundColor: selectedPeriod === 'All' ? '#f0f7ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPeriod !== 'All') {
                      e.target.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPeriod !== 'All') {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ color: selectedPeriod === 'All' ? '#3b82f6' : '#1f2937' }}>All</span>
                  {selectedPeriod === 'All' && (
                    <span style={{ color: '#3b82f6', fontSize: '16px' }}>âœ“</span>
                  )}
                </div>

                {/* Current Section */}
                <div style={{
                  padding: '8px 16px 4px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Current
                </div>
                {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'].map((period) => {
                  const matchesSearch = !periodSearch || period.toLowerCase().includes(periodSearch.toLowerCase());
                  if (!matchesSearch) return null;
                  
                  return (
                    <div
                      key={period}
                      onClick={() => {
                        setSelectedPeriod(period);
                        setShowPeriodDropdown(false);
                        setPeriodSearch('');
                      }}
                      style={{
                        padding: '10px 16px 10px 32px',
                        fontSize: '14px',
                        color: '#1f2937',
                        cursor: 'pointer',
                        backgroundColor: selectedPeriod === period ? 'rgba(21, 99, 114, 0.1)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPeriod !== period) {
                          e.target.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPeriod !== period) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ color: selectedPeriod === period ? '#156372' : '#1f2937' }}>{period}</span>
                      {selectedPeriod === period && (
                        <span style={{ color: '#156372', fontSize: '16px' }}>âœ“</span>
                      )}
                    </div>
                  );
                })}

                {/* Previous Section */}
                <div style={{
                  padding: '8px 16px 4px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '8px'
                }}>
                  Previous
                </div>
                {['Yesterday', 'Previous Week', 'Previous Month', 'Previous Quarter', 'Previous Year'].map((period) => {
                  const matchesSearch = !periodSearch || period.toLowerCase().includes(periodSearch.toLowerCase());
                  if (!matchesSearch) return null;
                  
                  return (
                    <div
                      key={period}
                      onClick={() => {
                        setSelectedPeriod(period);
                        setShowPeriodDropdown(false);
                        setPeriodSearch('');
                      }}
                      style={{
                        padding: '10px 16px 10px 32px',
                        fontSize: '14px',
                        color: '#1f2937',
                        cursor: 'pointer',
                        backgroundColor: selectedPeriod === period ? 'rgba(21, 99, 114, 0.1)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPeriod !== period) {
                          e.target.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPeriod !== period) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ color: selectedPeriod === period ? '#156372' : '#1f2937' }}>{period}</span>
                      {selectedPeriod === period && (
                        <span style={{ color: '#156372', fontSize: '16px' }}>âœ“</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
        <select 
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          style={{ 
            border: '1px solid #d1d5db', 
            padding: '6px 12px', 
            borderRadius: '4px', 
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <option value="">ðŸ‘¤ Select customer</option>
          {customers.map(customer => (
            <option key={customer.id} value={customer.name}>{customer.name}</option>
          ))}
        </select>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
        <select 
          value={selectedProjectFilter}
          onChange={(e) => setSelectedProjectFilter(e.target.value)}
          style={{ 
            border: '1px solid #d1d5db', 
            padding: '6px 12px', 
            borderRadius: '4px', 
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'white'
          }}
        >
          <option value="">ðŸ’¼ Select a project</option>
          {projects.map(project => (
            <option key={project.id} value={project.projectName}>{project.projectName}</option>
          ))}
        </select>
        <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
        <select 
          value={selectedUserFilter}
          onChange={(e) => setSelectedUserFilter(e.target.value)}
          style={{ 
            border: '1px solid #d1d5db', 
            padding: '6px 12px', 
            borderRadius: '4px', 
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'white'
          }}
        >
          <option value="">ðŸ‘¥ Select user</option>
          {users.map(user => (
            <option key={user.id} value={user.name}>{user.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content Area - Custom View Form or Empty State */}
      {showCustomView ? (
        <div style={{ 
          flex: 1, 
          backgroundColor: '#f5f5f5',
          padding: '24px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '1000px',
            margin: '0 auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* Page Title */}
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '32px' 
            }}>
              New Custom View
            </h1>

            {/* Name Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Name<span style={{ color: '#156372' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  onClick={() => setIsFavorite(!isFavorite)}>
                  <span style={{ fontSize: '18px', color: isFavorite ? '#fbbf24' : '#9ca3af' }}>
                    {isFavorite ? 'â˜…' : 'â˜†'}
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Mark as Favorite</span>
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Enter view name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Define the criteria Section */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                display: 'block',
                marginBottom: '16px'
              }}>
                Define the criteria (if any)
              </label>
              {criteria.map((criterion, index) => (
                <div key={criterion.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '12px' 
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#6b7280',
                    minWidth: '24px'
                  }}>{index + 1}</span>
                  <select style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}>
                    <option>Select a field</option>
                    <option>Date</option>
                    <option>Customer</option>
                    <option>Project</option>
                    <option>Billing Status</option>
                  </select>
                  <select style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}>
                    <option>Select a comparator</option>
                    <option>Equals</option>
                    <option>Not equals</option>
                    <option>Contains</option>
                    <option>Greater than</option>
                    <option>Less than</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Enter value"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                  <button 
                    style={{
                      padding: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#3b82f6'
                    }}
                    onClick={() => setCriteria([...criteria, { id: Date.now(), field: '', comparator: '', value: '' }])}
                  >
                    +
                  </button>
                  {criteria.length > 1 && (
                    <button 
                      style={{
                        padding: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: '#ef4444'
                      }}
                      onClick={() => setCriteria(criteria.filter(c => c.id !== criterion.id))}
                    >
                      ðŸ—‘ï¸
                    </button>
                  )}
                </div>
              ))}
              <button 
                style={{
                  padding: '8px 16px',
                  border: '1px dashed #d1d5db',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '8px'
                }}
                onClick={() => setCriteria([...criteria, { id: Date.now(), field: '', comparator: '', value: '' }])}
                onMouseOver={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.color = '#3b82f6';
                }}
                onMouseOut={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.color = '#6b7280';
                }}
              >
                + Add Criterion
              </button>
            </div>

            {/* Columns Preference Section */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                display: 'block',
                marginBottom: '16px'
              }}>
                Columns Preference:
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px' 
              }}>
                {/* Available Columns */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    marginBottom: '12px'
                  }}>
                    AVAILABLE COLUMNS
                  </div>
                  <div style={{ 
                    position: 'relative', 
                    marginBottom: '12px' 
                  }}>
                    <input 
                      type="text" 
                      placeholder="Search"
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    <span style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }}>ðŸ”</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableColumns
                      .filter(col => !selectedColumns.includes(col))
                      .map((column) => (
                        <div 
                          key={column}
                          style={{
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#1f2937',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onClick={() => setSelectedColumns([...selectedColumns, column])}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <span style={{ fontSize: '16px', color: '#9ca3af' }}>â‹®â‹®</span>
                          {column}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Selected Columns */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: '#10b981', fontSize: '16px' }}>âœ“</span>
                    SELECTED COLUMNS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedColumns.map((column) => (
                      <div 
                        key={column}
                        style={{
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: '#1f2937',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          justifyContent: 'space-between'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px', color: '#9ca3af' }}>â‹®â‹®</span>
                          {column}
                          {column === 'Project' && <span style={{ color: '#156372' }}>*</span>}
                        </div>
                        {column !== 'Project' && (
                          <button
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              color: '#156372',
                              fontSize: '16px',
                              padding: '4px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColumns(selectedColumns.filter(c => c !== column));
                            }}
                          >
                            Ã—
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Visibility Preference Section */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                display: 'block',
                marginBottom: '16px'
              }}>
                Visibility Preference
              </label>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280', marginRight: '16px' }}>
                  Share With:
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1f2937'
                }}>
                  <input 
                    type="radio" 
                    name="visibility" 
                    value="only-me"
                    checked={visibility === 'only-me'}
                    onChange={(e) => setVisibility(e.target.value)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Only Me
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1f2937'
                }}>
                  <input 
                    type="radio" 
                    name="visibility" 
                    value="selected-users"
                    checked={visibility === 'selected-users'}
                    onChange={(e) => setVisibility(e.target.value)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ marginRight: '6px' }}>ðŸ‘¤</span>
                  Only Selected Users & Roles
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#1f2937'
                }}>
                  <input 
                    type="radio" 
                    name="visibility" 
                    value="everyone"
                    checked={visibility === 'everyone'}
                    onChange={(e) => setVisibility(e.target.value)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ marginRight: '6px' }}>ðŸ¢</span>
                  Everyone
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button 
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                onClick={() => {
                  // Handle save logic here
                  setShowCustomView(false);
                }}
              >
                Save
              </button>
              <button 
                style={{
                  padding: '10px 24px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onClick={() => setShowCustomView(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : timeEntries.length === 0 ? (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'white',
          padding: '40px'
        }}>
        {/* Video Tutorial Card */}
        <div style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px', 
          padding: '24px', 
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            background: 'radial-gradient(circle, rgba(229,231,235,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.5
          }}></div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
            gap: '16px'
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              backgroundColor: '#10b981', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(16,185,129,0.3)'
            }}>
              <span style={{ color: 'white', fontSize: '24px', marginLeft: '4px' }}>â–¶</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Taban Books</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>How to log time</div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#1f2937', 
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          Create your first time entry
        </h2>

        {/* Descriptive Text */}
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          marginBottom: '24px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          Log the time spent on project tasks and charge your customers accordingly.
        </p>

        {/* Primary Action Button */}
        <button style={{ 
          backgroundColor: '#3b82f6', 
          color: 'white', 
          border: 'none', 
          padding: '12px 32px', 
          borderRadius: '6px', 
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '32px',
          boxShadow: '0 4px 6px rgba(59,130,246,0.3)',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          LOG TIME
        </button>

        {/* Chrome Extension Link */}
        <a href="#" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#3b82f6', 
          textDecoration: 'none',
          fontSize: '14px'
        }}
        onMouseOver={(e) => e.target.style.textDecoration = 'none'}
        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
        >
          <span style={{ fontSize: '18px' }}>ðŸŒ</span>
          <span>Timer - Chrome Extension</span>
        </a>
      </div>
      ) : viewMode === 'calendar' ? (
        <div style={{ 
          flex: 1, 
          backgroundColor: '#f5f5f5',
          padding: '24px',
          overflowY: 'auto'
        }}>
          {/* Calendar View */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* Calendar Header with Month Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCalendarDate(newDate);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#374151',
                  padding: '8px'
                }}
              >
                â€¹
              </button>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                {calendarDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </h2>
              <button
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCalendarDate(newDate);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#374151',
                  padding: '8px'
                }}
              >
                â€º
              </button>
      </div>

            {/* Calendar Grid */}
            <div style={{ marginBottom: '24px' }}>
              {/* Days of Week Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr) auto',
                gap: '1px',
                backgroundColor: '#e5e7eb',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'TOTAL'].map(day => (
                  <div
                    key={day}
                    style={{
                      backgroundColor: '#f9fafb',
                      padding: '12px 8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              {(() => {
                const year = calendarDate.getFullYear();
                const month = calendarDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - startDate.getDay());
                const weeks = [];
                let currentDate = new Date(startDate);
                const today = new Date();

                while (currentDate <= lastDay || weeks.length < 6) {
                  const week = [];
                  let weekTotalMinutes = 0;

                  for (let i = 0; i < 7; i++) {
                    const dayEntries = timeEntries.filter(entry => {
                      try {
                        const entryDate = new Date(entry.date.split(' ').reverse().join(' '));
                        return entryDate.toDateString() === currentDate.toDateString();
                      } catch (e) {
                        return false;
                      }
                    });

                    let dayTotalMinutes = 0;
                    dayEntries.forEach(entry => {
                      const timeParts = entry.timeSpent.split(':');
                      dayTotalMinutes += (parseInt(timeParts[0]) || 0) * 60 + (parseInt(timeParts[1]) || 0);
                    });
                    weekTotalMinutes += dayTotalMinutes;

                    const isCurrentMonth = currentDate.getMonth() === month;
                    const isToday = currentDate.toDateString() === today.toDateString();

                    week.push({
                      date: new Date(currentDate),
                      day: currentDate.getDate(),
                      entries: dayEntries,
                      totalMinutes: dayTotalMinutes,
                      isCurrentMonth,
                      isToday
                    });

                    currentDate.setDate(currentDate.getDate() + 1);
                  }

                  weeks.push({ days: week, totalMinutes: weekTotalMinutes });
                  if (currentDate > lastDay && currentDate.getDay() === 0) break;
                }

                return weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr) auto',
                      gap: '1px',
                      backgroundColor: '#e5e7eb',
                      borderLeft: '1px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      borderBottom: weekIndex === weeks.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}
                  >
                    {week.days.map((day, dayIndex) => {
                      const hours = Math.floor(day.totalMinutes / 60);
                      const minutes = day.totalMinutes % 60;
                      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                      return (
                        <div
                          key={dayIndex}
                          style={{
                            backgroundColor: 'white',
                            padding: '12px 8px',
                            minHeight: '100px',
                            borderRight: dayIndex < 6 ? '1px solid #e5e7eb' : 'none',
                            opacity: day.isCurrentMonth ? 1 : 0.3,
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => {
                            // Could open entry form for this day
                          }}
                        >
                          {/* Plus Icon */}
                          {day.isCurrentMonth && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const formattedDate = day.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                setSelectedDateForLogEntry(formattedDate);
                                setShowLogEntryForm(true);
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#156372',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '600',
                                padding: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                zIndex: 10
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#2563eb';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#3b82f6';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              +
                            </button>
                          )}
                          <div style={{
                            fontSize: '14px',
                            fontWeight: day.isToday ? '600' : '400',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: day.isToday ? '#e3f2fd' : 'transparent',
                            color: day.isToday ? '#3b82f6' : (day.isCurrentMonth ? '#1f2937' : '#9ca3af'),
                            margin: '0 auto 8px'
                          }}>
                            {day.day}
                          </div>
                          {day.entries.length > 0 && (
                            <div style={{
                              fontSize: '12px',
                              color: '#1f2937',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontWeight: '600',
                                marginBottom: '4px'
                              }}>
                                {timeStr}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#6b7280',
                                marginBottom: '2px'
                              }}>
                                Total Logged Hours
                              </div>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to entries for this day
                                }}
                                style={{
                                  fontSize: '11px',
                                  color: '#156372',
                                  cursor: 'pointer',
                                  textDecoration: 'none'
                                }}
                              >
                                {day.entries.length} Timesheet{day.entries.length > 1 ? 's' : ''} â€º
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Week Total */}
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '12px 8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      minHeight: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(() => {
                        const weekHours = Math.floor(week.totalMinutes / 60);
                        const weekMins = week.totalMinutes % 60;
                        return `${String(weekHours).padStart(2, '0')}:${String(weekMins).padStart(2, '0')}`;
                      })()}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Grand Total */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '2px solid #e5e7eb',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              <span style={{ marginRight: '12px' }}>Total Hours :</span>
              <span style={{
                color: '#156372',
                fontSize: '16px'
              }}>
                {(() => {
                  // Calculate total from filtered entries
                  const filtered = getFilteredEntries(timeEntries);
                  const totalMinutes = filtered.reduce((sum, entry) => {
                    // Handle both "HH:MM" and "3h 0m" formats
                    let hours = 0;
                    let minutes = 0;
                    if (entry.timeSpent && (entry.timeSpent.includes('h') || entry.timeSpent.includes('m'))) {
                      const hoursMatch = entry.timeSpent.match(/(\d+)h/);
                      const minutesMatch = entry.timeSpent.match(/(\d+)m/);
                      hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
                      minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
                    } else if (entry.timeSpent && entry.timeSpent.includes(':')) {
                    const timeParts = entry.timeSpent.split(':');
                      hours = parseInt(timeParts[0]) || 0;
                      minutes = parseInt(timeParts[1]) || 0;
                    } else if (entry.hours !== undefined) {
                      hours = entry.hours || 0;
                      minutes = entry.minutes || 0;
                    }
                    return sum + hours * 60 + minutes;
                  }, 0);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                })()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          flex: 1, 
          display: 'flex',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          {/* Table Section */}
          <div style={{ 
            flex: selectedEntry ? '0 0 60%' : '1',
            overflowY: 'auto',
            borderRight: selectedEntry ? '1px solid #e5e7eb' : 'none'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'visible'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                {selectedEntries.length === 0 && (
                <thead>
                  <tr style={{
                    backgroundColor: '#f9fafb',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      width: '40px'
                    }}>
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedEntries.length === sortedEntries.length && sortedEntries.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntries(sortedEntries.map(e => e.id));
                            } else {
                              setSelectedEntries([]);
                            }
                          }}
                          style={{
                            cursor: "pointer"
                          }}
                        />
                        DATE
                      </div>
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      PROJECT
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      CUSTOMER
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        TASK
                        <span style={{ fontSize: '10px' }}>â–²â–¼</span>
                      </div>
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      USER
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      TIME
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      BILLING STATUS
                    </th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '80px'
                    }}>
                      {/* Actions column header */}
                    </th>
                  </tr>
                </thead>
                )}
                <tbody>
                  {sortedEntries.map((entry) => {
                    // Find project to get customer name
                    const project = projects.find(p => p.projectName === entry.projectName);
                    const customerName = project?.customerName || '';
                    
                    const isHovered = hoveredEntryId === entry.id;
                    
                    return (
                      <tr key={entry.id} style={{
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        backgroundColor: selectedEntry?.id === entry.id ? '#f0f7ff' : (isHovered ? '#f9fafb' : 'white')
                      }}
                      onClick={() => setSelectedEntry(entry)}
                      onMouseEnter={(e) => {
                        setHoveredEntryId(entry.id);
                        if (selectedEntry?.id !== entry.id) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        setHoveredEntryId(null);
                        if (selectedEntry?.id !== entry.id) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                      >
                        <td 
                          style={{ padding: '12px 16px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input 
                            type="checkbox" 
                            checked={selectedEntries.includes(entry.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEntries([...selectedEntries, entry.id]);
                              } else {
                                setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer' }} 
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                          {entry.date}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            color: '#156372',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const projectId = project?.id;
                            if (projectId) {
                              navigate(`/time-tracking/projects/${projectId}`);
                            }
                          }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'none'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {entry.projectName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                          {customerName}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {entry.taskName.split(',').map((task, idx) => (
                              <span key={idx}>{task.trim()}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                          {entry.user}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                          {entry.timeSpent}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            color: entry.billingStatus === 'Invoiced' ? '#10b981' : '#156372',
                            fontWeight: '500'
                          }}>
                            {entry.billingStatus || 'Unbilled'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '8px',
                            opacity: isHovered ? 1 : 0,
                            transition: 'opacity 0.2s'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEntry(entry);
                                setIsEditingEntry(true);
                                // Convert date to YYYY-MM-DD format for date picker
                                let dateValue = entry.date;
                                try {
                                  const date = new Date(entry.date);
                                  if (!isNaN(date.getTime())) {
                                    dateValue = date.toISOString().split('T')[0];
                                  }
                                } catch (e) {
                                  // Keep original if parsing fails
                                }
                                // Convert timeSpent from "3h 0m" to "HH:MM" format
                                let timeSpentValue = entry.timeSpent;
                                if (timeSpentValue && (timeSpentValue.includes('h') || timeSpentValue.includes('m'))) {
                                  const hoursMatch = timeSpentValue.match(/(\d+)h/);
                                  const minutesMatch = timeSpentValue.match(/(\d+)m/);
                                  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
                                  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
                                  timeSpentValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                }
                                setEditedEntryData({ 
                                  ...entry, 
                                  date: dateValue,
                                  timeSpent: timeSpentValue
                                });
                              }}
                              style={{
                                padding: '6px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#f3f4f6';
                                e.target.style.borderColor = '#9ca3af';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#fff';
                                e.target.style.borderColor = '#d1d5db';
                              }}
                            >
                              <Edit3 size={16} color="#374151" />
                            </button>
                            <div style={{ position: 'relative', zIndex: openDropdownEntryId === entry.id ? 10000 : 'auto' }} data-dropdown-entry-id={entry.id}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownEntryId(openDropdownEntryId === entry.id ? null : entry.id);
                                }}
                                style={{
                                  padding: '6px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  backgroundColor: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = '#f3f4f6';
                                  e.target.style.borderColor = '#9ca3af';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = '#fff';
                                  e.target.style.borderColor = '#d1d5db';
                                }}
                              >
                                <Settings size={16} color="#374151" />
                              </button>
                              {openDropdownEntryId === entry.id && (
                                <div 
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    minWidth: '180px',
                                    zIndex: 9999,
                                    padding: '4px 0',
                                    border: '1px solid #e5e7eb'
                                  }}
                                >
                                  <div
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        // Clone entry by creating a new one with same data
                                        // Parse date correctly
                                        let entryDate = new Date();
                                        try {
                                          if (entry.date) {
                                            const parsedDate = new Date(entry.date);
                                            if (!isNaN(parsedDate.getTime())) {
                                              entryDate = parsedDate;
                                            }
                                          }
                                        } catch (e) {
                                          console.error('Date parsing error in clone:', e);
                                        }
                                        
                                        const clonedEntryData = {
                                          project: entry.projectId,
                                          user: entry.userId,
                                          date: entryDate.toISOString(),
                                          hours: entry.hours || 0,
                                          minutes: entry.minutes || 0,
                                          description: entry.notes || entry.description || '',
                                          billable: entry.billable !== undefined ? entry.billable : true,
                                          task: entry.taskName || entry.task || '',
                                        };
                                        
                                        const response = await timeEntriesAPI.create(clonedEntryData);
                                      const clonedEntry = {
                                          id: response?._id || response?.id || response?.data?._id,
                                          ...clonedEntryData,
                                          projectName: entry.projectName,
                                          userName: entry.userName || entry.user || '--',
                                          user: entry.userName || entry.user || '--', // Ensure user is a string
                                          timeSpent: entry.timeSpent,
                                          billingStatus: entry.billingStatus || 'Unbilled',
                                        };
                                        
                                        // Refresh entries
                                        const allResponse = await timeEntriesAPI.getAll();
                                        const data = Array.isArray(allResponse) ? allResponse : (allResponse?.data || []);
                                        const transformedEntries = data.map(e => {
                                          const userName = typeof e.user === 'object' && e.user !== null
                                            ? (e.user.name || '--')
                                            : (e.userName || e.user || '--');
                                          
                                          return {
                                            id: e._id || e.id,
                                            projectId: e.project?._id || e.projectId,
                                            projectName: e.project?.name || e.projectName,
                                            projectNumber: e.project?.projectNumber || e.projectNumber,
                                            userId: e.user?._id || e.userId,
                                            userName: userName,
                                            user: userName,
                                            date: e.date ? new Date(e.date).toLocaleDateString() : new Date().toLocaleDateString(),
                                            hours: e.hours || 0,
                                            minutes: e.minutes || 0,
                                            timeSpent: e.hours ? `${e.hours}h ${e.minutes || 0}m` : '0h',
                                            description: e.description || '',
                                            task: e.task || e.taskName || '',
                                            taskName: e.task || e.taskName || '',
                                            billable: e.billable !== undefined ? e.billable : true,
                                            billingRate: e.billingRate || 0,
                                            notes: e.description || e.notes || '',
                                            billingStatus: e.billingStatus || 'Unbilled',
                                          };
                                        });
                                        setTimeEntries(transformedEntries);
                                        
                                      window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                                      setOpenDropdownEntryId(null);
                                      setSelectedEntry(clonedEntry);
                                        toast.success('Entry cloned successfully');
                                      } catch (error) {
                                        console.error("Error cloning entry:", error);
                                        toast.error("Failed to clone entry");
                                      }
                                    }}
                                    style={{
                                      padding: '10px 16px',
                                      fontSize: '14px',
                                      color: 'white',
                                      cursor: 'pointer',
                                      background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)',
                                      border: 'none',
                                      borderRadius: '4px'
                                    }}
                                    onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                                  >
                                    Clone
                                  </div>
                                  <div
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (window.confirm('Are you sure you want to delete this log entry?')) {
                                        try {
                                          await timeEntriesAPI.delete(entry.id);
                                          
                                          // Refresh entries
                                          const response = await timeEntriesAPI.getAll();
                                          const data = Array.isArray(response) ? response : (response?.data || []);
                                          const transformedEntries = data.map(e => {
                                            const userName = typeof e.user === 'object' && e.user !== null
                                              ? (e.user.name || '--')
                                              : (e.userName || e.user || '--');
                                            
                                            return {
                                              id: e._id || e.id,
                                              projectId: e.project?._id || e.projectId,
                                              projectName: e.project?.name || e.projectName,
                                              projectNumber: e.project?.projectNumber || e.projectNumber,
                                              userId: e.user?._id || e.userId,
                                              userName: userName,
                                              user: userName,
                                              date: e.date ? new Date(e.date).toLocaleDateString() : new Date().toLocaleDateString(),
                                              hours: e.hours || 0,
                                              minutes: e.minutes || 0,
                                              timeSpent: e.hours ? `${e.hours}h ${e.minutes || 0}m` : '0h',
                                              description: e.description || '',
                                              task: e.task || e.taskName || '',
                                              taskName: e.task || e.taskName || '',
                                              billable: e.billable !== undefined ? e.billable : true,
                                              billingRate: e.billingRate || 0,
                                              notes: e.description || e.notes || '',
                                              billingStatus: e.billingStatus || 'Unbilled',
                                            };
                                          });
                                          setTimeEntries(transformedEntries);
                                          
                                        window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                                        setOpenDropdownEntryId(null);
                                        if (selectedEntry?.id === entry.id) {
                                          setSelectedEntry(null);
                                          }
                                          toast.success('Entry deleted successfully');
                                        } catch (error) {
                                          console.error("Error deleting entry:", error);
                                          toast.error("Failed to delete entry");
                                        }
                                      }
                                    }}
                                    style={{
                                      padding: '10px 16px',
                                      fontSize: '14px',
                                      color: '#1f2937',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                  >
                                    Delete
                                  </div>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEntry(entry);
                                      setActiveTab('comments');
                                      setOpenDropdownEntryId(null);
                                    }}
                                    style={{
                                      padding: '10px 16px',
                                      fontSize: '14px',
                                      color: '#1f2937',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                  >
                                    Comments & History
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedEntry && (
            <div style={{
              flex: '0 0 40%',
              backgroundColor: 'white',
              borderLeft: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  {selectedEntry.user}'s Log Entry
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => {
                      setIsEditingEntry(true);
                      // Convert date to YYYY-MM-DD format for date picker
                      let dateValue = selectedEntry.date;
                      try {
                        const date = new Date(selectedEntry.date);
                        if (!isNaN(date.getTime())) {
                          dateValue = date.toISOString().split('T')[0];
                        }
                      } catch (e) {
                        // Keep original if parsing fails
                      }
                      // Convert timeSpent from "3h 0m" to "HH:MM" format
                      let timeSpentValue = selectedEntry.timeSpent;
                      if (timeSpentValue && (timeSpentValue.includes('h') || timeSpentValue.includes('m'))) {
                        const hoursMatch = timeSpentValue.match(/(\d+)h/);
                        const minutesMatch = timeSpentValue.match(/(\d+)m/);
                        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
                        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
                        timeSpentValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                      }
                      setEditedEntryData({ 
                        ...selectedEntry, 
                        date: dateValue,
                        timeSpent: timeSpentValue
                      });
                      setActiveTab('otherDetails'); // Switch to Other Details tab when editing
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div style={{ position: 'relative' }} ref={moreDropdownRef}>
                    <button 
                      onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="5" r="1.5" fill="#6b7280" />
                        <circle cx="12" cy="12" r="1.5" fill="#6b7280" />
                        <circle cx="12" cy="19" r="1.5" fill="#6b7280" />
                      </svg>
                    </button>
                    {showMoreDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: '140px',
                        zIndex: 1000,
                        padding: '4px 0',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div
                          onClick={() => {
                            // Clone entry
                            const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
                            const clonedEntry = {
                              ...selectedEntry,
                              id: Date.now().toString(),
                              createdAt: new Date().toISOString()
                            };
                            existingEntries.push(clonedEntry);
                            localStorage.setItem('timeEntries', JSON.stringify(existingEntries));
                            window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                            setShowMoreDropdown(false);
                            setSelectedEntry(clonedEntry);
                          }}
                          style={{
                            padding: '10px 16px',
                            fontSize: '14px',
                            color: '#1f2937',
                            cursor: 'pointer',
                            backgroundColor: '#156372',
                            color: 'white'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                        >
                          Clone
                        </div>
                        <div
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this log entry?')) {
                              const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
                              const filteredEntries = existingEntries.filter(e => e.id !== selectedEntry.id);
                              localStorage.setItem('timeEntries', JSON.stringify(filteredEntries));
                              window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                              setShowMoreDropdown(false);
                              setSelectedEntry(null);
                            }
                          }}
                          style={{
                            padding: '10px 16px',
                            fontSize: '14px',
                            color: '#1f2937',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          Delete
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedEntry(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6l12 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Summary Card */}
              <div style={{
                margin: '20px 24px',
                padding: '20px',
                backgroundColor: '#fff7ed',
                borderRadius: '8px',
                border: '1px solid #fed7aa',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 12px',
                  backgroundColor: selectedEntry.billingStatus === 'Invoiced' ? '#10b981' : '#fb923c',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {selectedEntry.billingStatus || 'Unbilled'}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#1f2937',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '16px' }}>ðŸ“…</span>
                  <span>{selectedEntry.date}</span>
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  {(() => {
                    // Handle both "HH:MM" and "3h 0m" formats
                    let hours = 0;
                    let minutes = 0;
                    
                    if (selectedEntry.timeSpent.includes('h') || selectedEntry.timeSpent.includes('m')) {
                      // Format: "3h 0m"
                      const hoursMatch = selectedEntry.timeSpent.match(/(\d+)h/);
                      const minutesMatch = selectedEntry.timeSpent.match(/(\d+)m/);
                      hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
                      minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
                    } else if (selectedEntry.timeSpent.includes(':')) {
                      // Format: "HH:MM"
                    const timeParts = selectedEntry.timeSpent.split(':');
                      hours = parseInt(timeParts[0]) || 0;
                      minutes = parseInt(timeParts[1]) || 0;
                    } else if (selectedEntry.hours !== undefined) {
                      // Use hours and minutes directly from entry
                      hours = selectedEntry.hours || 0;
                      minutes = selectedEntry.minutes || 0;
                    }
                    
                    return `${hours} hrs : ${minutes} mins`;
                  })()}
                </div>
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #e5e7eb',
                padding: '0 24px'
              }}>
                <button
                  onClick={() => setActiveTab('otherDetails')}
                  style={{
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'otherDetails' ? '2px solid #3b82f6' : '2px solid transparent',
                    color: activeTab === 'otherDetails' ? '#3b82f6' : '#6b7280',
                    fontSize: '14px',
                    fontWeight: activeTab === 'otherDetails' ? '600' : '500',
                    cursor: 'pointer'
                  }}
                >
                  Other Details
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  style={{
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'comments' ? '2px solid #3b82f6' : '2px solid transparent',
                    color: activeTab === 'comments' ? '#3b82f6' : '#6b7280',
                    fontSize: '14px',
                    fontWeight: activeTab === 'comments' ? '600' : '500',
                    cursor: 'pointer'
                  }}
                >
                  Comments
                </button>
              </div>

              {/* Tab Content */}
              <div style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto'
              }}>
                {activeTab === 'otherDetails' && (
                  isEditingEntry ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Date Field */}
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Date<span style={{ color: '#156372' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={(() => {
                            // Convert date to YYYY-MM-DD format for date input
                            if (!editedEntryData?.date) return '';
                            try {
                              const date = new Date(editedEntryData.date);
                              if (!isNaN(date.getTime())) {
                                return date.toISOString().split('T')[0];
                              }
                              // Try parsing as locale date string
                              const parts = editedEntryData.date.split('/');
                              if (parts.length === 3) {
                                const [month, day, year] = parts;
                                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                              }
                            } catch (e) {
                              console.error('Date parsing error:', e);
                            }
                            return '';
                          })()}
                          onChange={(e) => setEditedEntryData({ ...editedEntryData, date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#156372'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                      </div>

                      {/* Project Name Field */}
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Project Name<span style={{ color: '#156372' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={editedEntryData?.projectName || ''}
                            onChange={(e) => {
                              setEditedEntryData({ 
                                ...editedEntryData, 
                                projectName: e.target.value,
                                taskName: '' // Reset task when project changes
                              });
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
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          >
                            <option value="">Select a project</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.projectName}>
                                {project.projectName}
                              </option>
                            ))}
                          </select>
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6b7280'
                          }}>â–¼</span>
                        </div>
                      </div>

                      {/* Task Name Field */}
                      <div>
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
                          <select
                            value={editedEntryData?.taskName || ''}
                            onChange={(e) => setEditedEntryData({ ...editedEntryData, taskName: e.target.value })}
                            disabled={!editedEntryData?.projectName}
                            style={{
                              width: '100%',
                              padding: '10px 36px 10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                              appearance: 'none',
                              cursor: editedEntryData?.projectName ? 'pointer' : 'not-allowed',
                              backgroundColor: editedEntryData?.projectName ? 'white' : '#f9fafb',
                              color: editedEntryData?.projectName ? '#1f2937' : '#9ca3af'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          >
                            <option value="">Select task</option>
                            {(() => {
                              const selectedProject = projects.find(p => p.projectName === editedEntryData?.projectName);
                              return selectedProject?.tasks || [];
                            })().map((task, index) => (
                              <option key={index} value={task.taskName || task.taskName}>
                                {task.taskName || 'Untitled Task'}
                              </option>
                            ))}
                          </select>
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6b7280'
                          }}>â–¼</span>
                        </div>
                      </div>

                      {/* Time Spent Field */}
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Time Spent<span style={{ color: '#156372' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={editedEntryData?.timeSpent || ''}
                          onChange={(e) => setEditedEntryData({ ...editedEntryData, timeSpent: e.target.value })}
                          placeholder="HH:MM"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                      </div>

                      {/* User Field */}
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          User<span style={{ color: '#156372' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={editedEntryData?.user || ''}
                            onChange={(e) => setEditedEntryData({ ...editedEntryData, user: e.target.value })}
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
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          >
                            <option value="">Select user</option>
                            <option value="tabanaaaa">tabanaaaa</option>
                            <option value="user2">user2</option>
                            <option value="user3">user3</option>
                          </select>
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#6b7280'
                          }}>â–¼</span>
                        </div>
                      </div>

                      {/* Billable Field */}
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={editedEntryData?.billable !== false}
                            onChange={(e) => setEditedEntryData({ ...editedEntryData, billable: e.target.checked })}
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer'
                            }}
                          />
                          Billable
                        </label>
                      </div>

                      {/* Notes Field */}
                      <div>
                        <label style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          display: 'block',
                          marginBottom: '6px'
                        }}>
                          Notes
                        </label>
                        <textarea
                          value={editedEntryData?.notes || ''}
                          onChange={(e) => setEditedEntryData({ ...editedEntryData, notes: e.target.value })}
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
                          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e5e7eb',
                        marginTop: '8px'
                      }}>
                        <button
                          onClick={async () => {
                            // Validate required fields
                            if (!editedEntryData?.date || !editedEntryData?.projectName || !editedEntryData?.taskName || !editedEntryData?.timeSpent) {
                              toast.error('Please fill in all required fields');
                              return;
                            }

                            try {
                              // Parse time spent - handle both "HH:MM" and "3h 0m" formats
                              let hours = 0;
                              let minutes = 0;
                              
                              if (editedEntryData.timeSpent.includes('h') || editedEntryData.timeSpent.includes('m')) {
                                // Format: "3h 0m" or "3h" or "30m"
                                const hoursMatch = editedEntryData.timeSpent.match(/(\d+)h/);
                                const minutesMatch = editedEntryData.timeSpent.match(/(\d+)m/);
                                hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
                                minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
                              } else if (editedEntryData.timeSpent.includes(':')) {
                                // Format: "HH:MM"
                                [hours, minutes] = editedEntryData.timeSpent.split(':').map(Number);
                              } else {
                                // Try to parse as number (hours)
                                const num = parseFloat(editedEntryData.timeSpent);
                                if (!isNaN(num)) {
                                  hours = Math.floor(num);
                                  minutes = Math.round((num % 1) * 60);
                                }
                              }

                              // Find project ID
                              const projectObj = projects.find(p => p.projectName === editedEntryData.projectName);
                              if (!projectObj) {
                                toast.error('Invalid project selected');
                                return;
                              }

                              // Parse date - handle YYYY-MM-DD format from date picker
                              let entryDate;
                              if (editedEntryData.date instanceof Date) {
                                entryDate = editedEntryData.date;
                              } else if (editedEntryData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                // YYYY-MM-DD format from date picker
                                entryDate = new Date(editedEntryData.date);
                              } else {
                                // Try parsing other formats
                                entryDate = new Date(editedEntryData.date);
                              }
                              
                              if (isNaN(entryDate.getTime())) {
                                toast.error('Invalid date format');
                                return;
                              }

                              // Update entry via API
                              const updateData = {
                                project: projectObj.id,
                                date: entryDate.toISOString(),
                                hours: hours || 0,
                                minutes: minutes || 0,
                                description: editedEntryData.notes || editedEntryData.description || '',
                                billable: editedEntryData.billable !== undefined ? editedEntryData.billable : true,
                                task: editedEntryData.taskName || '',
                              };

                              await timeEntriesAPI.update(selectedEntry.id, updateData);

                              // Refresh entries
                              const response = await timeEntriesAPI.getAll();
                              const data = Array.isArray(response) ? response : (response?.data || []);
                              const transformedEntries = data.map(e => {
                                const userName = typeof e.user === 'object' && e.user !== null
                                  ? (e.user.name || '--')
                                  : (e.userName || e.user || '--');
                                
                                return {
                                  id: e._id || e.id,
                                  projectId: e.project?._id || e.projectId,
                                  projectName: e.project?.name || e.projectName,
                                  projectNumber: e.project?.projectNumber || e.projectNumber,
                                  userId: e.user?._id || e.userId,
                                  userName: userName,
                                  user: userName,
                                  date: e.date ? new Date(e.date).toLocaleDateString() : new Date().toLocaleDateString(),
                                  hours: e.hours || 0,
                                  minutes: e.minutes || 0,
                                  timeSpent: e.hours ? `${e.hours}h ${e.minutes || 0}m` : '0h',
                                  description: e.description || '',
                                  task: e.task || e.taskName || '',
                                  taskName: e.task || e.taskName || '',
                                  billable: e.billable !== undefined ? e.billable : true,
                                  billingRate: e.billingRate || 0,
                                  notes: e.description || e.notes || '',
                                  billingStatus: e.billingStatus || 'Unbilled',
                                };
                              });
                              setTimeEntries(transformedEntries);

                              // Find updated entry
                              const updatedEntry = transformedEntries.find(e => e.id === selectedEntry.id) || selectedEntry;
                            
                            // Dispatch update event to refresh the timesheet table
                            window.dispatchEvent(new CustomEvent('timeEntryUpdated'));
                            
                            // Update selected entry and exit edit mode
                            setSelectedEntry(updatedEntry);
                            setIsEditingEntry(false);
                            setEditedEntryData(null);
                              toast.success('Entry updated successfully');
                            } catch (error) {
                              console.error("Error updating entry:", error);
                              toast.error("Failed to update entry");
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 24px',
                            background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => e.target.style.opacity = '0.9'}
                          onMouseOut={(e) => e.target.style.opacity = '1'}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingEntry(false);
                            setEditedEntryData(null);
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 24px',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#f9fafb';
                            e.target.style.borderColor = '#9ca3af';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.borderColor = '#d1d5db';
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6b7280'
                        }}>
                          Project Name :
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {selectedEntry.projectName}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6b7280'
                        }}>
                          Customer Name :
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {(() => {
                            const project = projects.find(p => p.projectName === selectedEntry.projectName);
                            return project?.customerName || '--';
                          })()}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6b7280'
                        }}>
                          Task Name :
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {selectedEntry.taskName}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6b7280'
                        }}>
                          User Name :
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {selectedEntry.user}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6b7280'
                        }}>
                          Notes :
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {selectedEntry.notes || '--'}
                        </span>
                      </div>
                    </div>
                  )
                )}
                {activeTab === 'comments' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Comment Input Section */}
                    <div>
                      {/* Formatting Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '8px',
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <button
                          type="button"
                          onClick={() => setIsBold(!isBold)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: isBold ? '#e5e7eb' : 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = isBold ? '#e5e7eb' : '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = isBold ? '#e5e7eb' : 'white'}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsItalic(!isItalic)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: isItalic ? '#e5e7eb' : 'white',
                            cursor: 'pointer',
                            fontStyle: 'italic',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = isItalic ? '#e5e7eb' : '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = isItalic ? '#e5e7eb' : 'white'}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsUnderline(!isUnderline)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: isUnderline ? '#e5e7eb' : 'white',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = isUnderline ? '#e5e7eb' : '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = isUnderline ? '#e5e7eb' : 'white'}
                        >
                          U
                        </button>
                      </div>

                      {/* Comment Text Area */}
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          outline: 'none',
                          fontWeight: isBold ? 'bold' : 'normal',
                          fontStyle: isItalic ? 'italic' : 'normal',
                          textDecoration: isUnderline ? 'underline' : 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                      />

                      {/* Add Comment Button */}
                      <button
                        onClick={() => {
                          if (commentText.trim() && selectedEntry) {
                            const newComment = {
                              id: Date.now().toString(),
                              text: commentText,
                              author: selectedEntry.user || 'User',
                              date: new Date().toISOString(),
                              formatting: {
                                bold: isBold,
                                italic: isItalic,
                                underline: isUnderline
                              }
                            };
                            
                            const allComments = JSON.parse(localStorage.getItem('timesheetComments') || '{}');
                            const entryComments = allComments[selectedEntry.id] || [];
                            entryComments.push(newComment);
                            allComments[selectedEntry.id] = entryComments;
                            localStorage.setItem('timesheetComments', JSON.stringify(allComments));
                            
                            setComments(entryComments);
                            setCommentText('');
                            setIsBold(false);
                            setIsItalic(false);
                            setIsUnderline(false);
                          }
                        }}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          backgroundColor: '#156372',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                          opacity: commentText.trim() ? 1 : 0.5
                        }}
                        disabled={!commentText.trim()}
                        onMouseEnter={(e) => {
                          if (commentText.trim()) {
                            e.target.style.backgroundColor = '#2563eb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (commentText.trim()) {
                            e.target.style.backgroundColor = '#3b82f6';
                          }
                        }}
                      >
                        Add Comment
                      </button>
                    </div>

                    {/* All Comments Section */}
                    <div>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '16px'
                      }}>
                        ALL COMMENTS
                      </h3>
                      
                      {comments.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '40px 20px',
                          color: '#6b7280'
                        }}>
                          <p style={{ fontSize: '14px' }}>No comments yet.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              style={{
                                padding: '16px',
                                backgroundColor: '#f9fafb',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '8px'
                              }}>
                                <div>
                                  <div style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    marginBottom: '4px'
                                  }}>
                                    {comment.author}
                                  </div>
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#6b7280'
                                  }}>
                                    {new Date(comment.date).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div style={{
                                fontSize: '14px',
                                color: '#111827',
                                lineHeight: '1.6',
                                fontWeight: comment.formatting?.bold ? 'bold' : 'normal',
                                fontStyle: comment.formatting?.italic ? 'italic' : 'normal',
                                textDecoration: comment.formatting?.underline ? 'underline' : 'none'
                              }}>
                                {comment.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Log Entry Form Modal */}
      {showLogEntryForm && (
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
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowLogEntryForm(false);
          }
        }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '24px 24px 8px 24px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0,
                  marginBottom: '4px'
                }}>
                  New Log Entry
                </h2>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Log time instantly using shortcut keys c + t
                </p>
              </div>
              <button
                onClick={() => setShowLogEntryForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#1f2937',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                Ã—
              </button>
            </div>

            {/* Form Content */}
            <div style={{
              padding: '24px'
            }}>
              {/* Date Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Date<span style={{ color: '#156372' }}>*</span>
                </label>
                <input
                  type="text"
                  value={logEntryData.date}
                  onChange={(e) => setLogEntryData({ ...logEntryData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Project Name Field */}
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
                <div style={{ position: 'relative' }}>
                  <select
                    value={logEntryData.projectName}
                    onChange={(e) => {
                      setLogEntryData({ 
                        ...logEntryData, 
                        projectName: e.target.value,
                        taskName: '' // Reset task when project changes
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.projectName}>
                        {project.projectName}
                      </option>
                    ))}
                  </select>
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>â–¼</span>
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
                  <select
                    value={logEntryData.taskName}
                    onChange={(e) => setLogEntryData({ ...logEntryData, taskName: e.target.value })}
                    disabled={!logEntryData.projectName}
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      appearance: 'none',
                      cursor: logEntryData.projectName ? 'pointer' : 'not-allowed',
                      backgroundColor: logEntryData.projectName ? 'white' : '#f9fafb',
                      color: logEntryData.projectName ? '#1f2937' : '#9ca3af'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="">Select task</option>
                    {availableTasks.map((task, index) => (
                      <option key={index} value={task.taskName || task.taskName}>
                        {task.taskName || 'Untitled Task'}
                      </option>
                    ))}
                  </select>
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>â–¼</span>
                </div>
              </div>

              {/* Time Spent Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px'
                }}>
                  Time Spent<span style={{ color: '#156372' }}>*</span>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#6b7280',
                    cursor: 'help'
                  }}>?</div>
                </label>
                <input
                  type="text"
                  value={logEntryData.timeSpent}
                  onChange={(e) => setLogEntryData({ ...logEntryData, timeSpent: e.target.value })}
                  placeholder="HH:MM"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    marginBottom: '8px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <a href="#" style={{
                  fontSize: '14px',
                  color: '#156372',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => e.target.style.textDecoration = 'none'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                >
                  <span>ðŸ•</span>
                  <span>Set start and end time instead</span>
                </a>
              </div>

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
                    checked={logEntryData.billable}
                    onChange={(e) => setLogEntryData({ ...logEntryData, billable: e.target.checked })}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6'
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

              {/* User Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  User<span style={{ color: '#156372' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={logEntryData.user}
                    onChange={(e) => setLogEntryData({ ...logEntryData, user: e.target.value })}
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
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="">Select user</option>
                    <option value="tabanaaaa">tabanaaaa</option>
                    <option value="user2">user2</option>
                    <option value="user3">user3</option>
                  </select>
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>â–¼</span>
                </div>
              </div>

              {/* Notes Field */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Notes
                </label>
                <textarea
                  value={logEntryData.notes}
                  onChange={(e) => setLogEntryData({ ...logEntryData, notes: e.target.value })}
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
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => {
                    // Get existing log entries from localStorage
                    const existingEntries = JSON.parse(localStorage.getItem('timeEntries') || '[]');
                    
                    // Create new log entry
                    const newEntry = {
                      id: Date.now().toString(),
                      date: logEntryData.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                      projectName: logEntryData.projectName || '',
                      taskName: logEntryData.taskName || '',
                      timeSpent: logEntryData.timeSpent || '',
                      billable: logEntryData.billable,
                      user: logEntryData.user || '',
                      notes: logEntryData.notes || '',
                      createdAt: new Date().toISOString()
                    };

                    // Add to array
                    existingEntries.push(newEntry);

                    // Save to localStorage
                    localStorage.setItem('timeEntries', JSON.stringify(existingEntries));

                    // Dispatch custom event to notify other components
                    window.dispatchEvent(new CustomEvent('timeEntryUpdated'));

                    // Reset form and close
                    setLogEntryData({
                      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                      projectName: '',
                      taskName: '',
                      timeSpent: '',
                      billable: true,
                      user: '',
                      notes: ''
                    });
                    setShowLogEntryForm(false);
                    
                    // Navigate to time entries page
                    navigate('/time-tracking/timesheet/entries');
                  }}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#156372',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowLogEntryForm(false);
                    setShowTimerModal(true);
                  }}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  Start Timer
                </button>
                <button
                  onClick={() => setShowLogEntryForm(false)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                Ã—
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
                00h : 00m : 00s
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
                    <path d="M8 2l4 4-4 4M4 8h8" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                        e.target.style.borderColor = '#3b82f6';
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
                      onMouseEnter={(e) => e.target.style.borderColor = '#3b82f6'}
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
                              e.target.style.borderColor = '#3b82f6';
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
                    accentColor: '#3b82f6'
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
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  // Start the timer and close the modal
                  setIsTimerRunning(true);
                  setShowTimerModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
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

      {/* New Log Entry Form Modal */}
      {showLogEntryForm && (
        <NewLogEntryForm
          onClose={() => {
            setShowLogEntryForm(false);
            setSelectedDateForLogEntry(null);
          }}
          defaultDate={selectedDateForLogEntry}
        />
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
          onClick={() => {
            setShowExportCurrentViewModal(false);
            setExportCurrentViewStep(1);
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '700px',
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
              marginBottom: '24px'
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
                onClick={() => {
                  setShowExportCurrentViewModal(false);
                  setExportCurrentViewStep(1);
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
                <X size={20} color="#6b7280" />
              </button>
            </div>
            
            {/* Progress Steps */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: '#e5e7eb',
                zIndex: 0
              }} />
              {[1, 2, 3].map((step) => (
                <div key={step} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  flex: 1
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: exportCurrentViewStep >= step ? '#156372' : '#e5e7eb',
                    color: exportCurrentViewStep >= step ? 'white' : '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {exportCurrentViewStep > step ? 'âœ“' : step}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: exportCurrentViewStep >= step ? '#156372' : '#9ca3af',
                    fontWeight: exportCurrentViewStep === step ? '600' : '400'
                  }}>
                    {step === 1 ? 'Configure' : step === 2 ? 'Review' : 'Export'}
                  </span>
                </div>
              ))}
            </div>

            {/* Step Content */}
            {exportCurrentViewStep === 1 && (
              <div>
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
              </div>
            )}

            {exportCurrentViewStep === 2 && (
              <div>
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
                    Review your export settings before proceeding.
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Export Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Decimal Format:</span>
                      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{exportCurrentViewData.decimalFormat}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>File Format:</span>
                      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{exportCurrentViewData.fileFormat}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Records to Export:</span>
                      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{sortedEntries.length} entries</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {exportCurrentViewStep === 3 && (
              <div>
                <div style={{
                  backgroundColor: '#d1fae5',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <Info size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#047857',
                    lineHeight: '1.5'
                  }}>
                    Your export is ready! Click Export to download the file.
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Export Summary</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    You are about to export {sortedEntries.length} time entries in {exportCurrentViewData.fileFormat} format.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px'
            }}>
              <button
                onClick={() => {
                  if (exportCurrentViewStep === 1) {
                    setShowExportCurrentViewModal(false);
                    setExportCurrentViewStep(1);
                  } else {
                    setExportCurrentViewStep(exportCurrentViewStep - 1);
                  }
                }}
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
              >
                {exportCurrentViewStep === 1 ? 'Cancel' : 'Previous'}
              </button>
              <button
                onClick={() => {
                  if (exportCurrentViewStep < 3) {
                    setExportCurrentViewStep(exportCurrentViewStep + 1);
                  } else {
                    exportTimesheets(exportCurrentViewData.fileFormat.toLowerCase(), sortedEntries);
                    setShowExportCurrentViewModal(false);
                    setExportCurrentViewStep(1);
                    toast.success('Export completed');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {exportCurrentViewStep === 3 ? 'Export' : 'Next >'}
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
          onClick={() => {
            setShowExportProjectsModal(false);
            setExportProjectsStep(1);
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '700px',
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
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Export {exportProjectsData.module}
              </h2>
              <button
                onClick={() => {
                  setShowExportProjectsModal(false);
                  setExportProjectsStep(1);
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
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {/* Progress Steps */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: '#e5e7eb',
                zIndex: 0
              }} />
              {[1, 2, 3].map((step) => (
                <div key={step} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                  flex: 1
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: exportProjectsStep >= step ? '#156372' : '#e5e7eb',
                    color: exportProjectsStep >= step ? 'white' : '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {exportProjectsStep > step ? 'âœ“' : step}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: exportProjectsStep >= step ? '#156372' : '#9ca3af',
                    fontWeight: exportProjectsStep === step ? '600' : '400'
                  }}>
                    {step === 1 ? 'Configure' : step === 2 ? 'Review' : 'Export'}
                  </span>
                </div>
              ))}
            </div>

            {/* Step Content */}
            {exportProjectsStep === 1 && (
              <div>
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
              </div>
            )}

            {exportProjectsStep === 2 && (
              <div>
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
                    Review your export settings before proceeding.
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Export Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Module:</span>
                      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{exportProjectsData.module}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Decimal Format:</span>
                      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{exportProjectsData.decimalFormat}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>File Format:</span>
                      <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{exportProjectsData.fileFormat}</span>
                    </div>
                    {exportProjectsData.exportTemplate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Export Template:</span>
                        <span style={{ color: '#111827', fontSize: '14px', fontWeight: '500' }}>{exportProjectsData.exportTemplate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {exportProjectsStep === 3 && (
              <div>
                <div style={{
                  backgroundColor: '#d1fae5',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <Info size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#047857',
                    lineHeight: '1.5'
                  }}>
                    Your export is ready! Click Export to download the file.
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Export Summary</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    You are about to export {exportProjectsData.module} data in {exportProjectsData.fileFormat} format.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px'
            }}>
              <button
                onClick={() => {
                  if (exportProjectsStep === 1) {
                    setShowExportProjectsModal(false);
                    setExportProjectsStep(1);
                  } else {
                    setExportProjectsStep(exportProjectsStep - 1);
                  }
                }}
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
              >
                {exportProjectsStep === 1 ? 'Cancel' : 'Previous'}
              </button>
              <button
                onClick={() => {
                  if (exportProjectsStep < 3) {
                    setExportProjectsStep(exportProjectsStep + 1);
                  } else {
                    if (exportProjectsData.module === "Timesheet") {
                      exportTimesheets(exportProjectsData.fileFormat.toLowerCase(), timeEntries);
                    } else {
                      toast.success(`Export ${exportProjectsData.module} functionality will be implemented`);
                    }
                    setShowExportProjectsModal(false);
                    setExportProjectsStep(1);
                    toast.success('Export completed');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#156372',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {exportProjectsStep === 3 ? 'Export' : 'Next >'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TimeTrackingPage() {
  const location = useLocation();

  return (
    <div className="page">
      <Routes>
        <Route path="projects" element={<TimeTrackingProject />} />
        <Route path="projects/new" element={<NewProjectForm />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/edit" element={<EditProjectForm />} />
        <Route path="projects/import" element={<ImportProjects />} />
        <Route path="projects/import-tasks" element={<ImportProjectTasks />} />
        <Route path="timesheet" element={<TimesheetTable />} />
        <Route path="timesheet/entries" element={<TimeEntriesPage />} />
        <Route path="timesheet/weekly" element={<WeeklyTimeLog />} />
        <Route path="timesheet/import" element={<ImportTimesheets />} />
        <Route
          path="*"
          element={location.pathname === "/time-tracking" ? <TimeTrackingProject /> : <TimeTrackingProject />}
        />
      </Routes>
    </div>
  );
}


