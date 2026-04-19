import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Info } from "lucide-react";
import { projectsAPI, timeEntriesAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import toast from "react-hot-toast";

export default function WeeklyTimeLog() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day; // Get Sunday of current week
    const sunday = new Date(today.setDate(diff));
    return sunday;
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([
    { id: 1, project: "", task: "", days: ["", "", "", "", "", "", ""], billable: true, total: "00:00" },
  ]);
  const [errors, setErrors] = useState({}); // Store errors for each day: { rowId_dayIndex: "error message" }

  // Get projects from database
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsAPI.getAll();
        const data = Array.isArray(response) ? response : (response?.data || []);
        setProjects(data.map(p => ({
          id: p._id || p.id,
          projectName: p.name || p.projectName,
          tasks: p.tasks || []
        })));
      } catch (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load projects");
      }
    };
    fetchProjects();
  }, []);

  // Calculate week dates
  const getWeekDates = () => {
    const dates = [];
    const startDate = new Date(currentWeek);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Format date for display
  const formatDate = (date) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
    if (newWeek.getFullYear() !== year) {
      setYear(newWeek.getFullYear());
    }
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
    if (newWeek.getFullYear() !== year) {
      setYear(newWeek.getFullYear());
    }
  };

  // Get tasks for selected project
  const getTasksForProject = (projectName) => {
    const project = projects.find((p) => p.projectName === projectName);
    return project?.tasks || [];
  };

  // Add new row
  const addNewRow = () => {
    const newRow = {
      id: Date.now(),
      project: "",
      task: "",
      days: ["", "", "", "", "", "", ""],
      billable: true,
      total: "00:00",
    };
    setRows([...rows, newRow]);
  };

  // Delete row
  const deleteRow = (rowId) => {
    setRows(rows.filter((row) => row.id !== rowId));
  };

  // Parse time input to minutes
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.trim()) return 0;

    const time = timeStr.trim();

    // Format: "HH:MM" or "H:MM"
    if (time.includes(":")) {
      const [hours, minutes] = time.split(":").map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    }

    // Format: "8h30m" or "8h" or "30m"
    if (time.includes("h") || time.includes("m")) {
      const hoursMatch = time.match(/(\d+)h/);
      const minutesMatch = time.match(/(\d+)m/);
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      return hours * 60 + minutes;
    }

    // Format: decimal hours (e.g., "8.5" = 8 hours 30 minutes)
    // Special case: .1 to .6 are treated as minutes (1-6 minutes)
    const decimal = parseFloat(time);
    if (!isNaN(decimal)) {
      // Check if it's .1 to .6 (minutes)
      if (time.startsWith('.') && decimal >= 0.1 && decimal <= 0.6) {
        return Math.round(decimal * 10); // .1 = 1 minute, .2 = 2 minutes, etc.
      }
      // Otherwise treat as decimal hours
      const hours = Math.floor(decimal);
      const minutes = Math.round((decimal % 1) * 60);
      return hours * 60 + minutes;
    }

    // If it's just a number, treat it as hours
    const num = parseFloat(time);
    if (!isNaN(num)) {
      return Math.round(num * 60);
    }

    return 0;
  };

  // Format minutes to HH:MM
  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Auto-format time input (called on blur)
  const formatTimeInput = (value) => {
    if (!value || !value.trim()) return "";

    const trimmed = value.trim();

    // If it's already in HH:MM format, return as is
    if (/^\d{1,2}:\d{1,2}$/.test(trimmed)) {
      return trimmed;
    }

    // If it includes h or m, return as is
    if (trimmed.includes("h") || trimmed.includes("m")) {
      return trimmed;
    }

    // Check if it's .1 to .6 (treat as minutes) - must start with dot and be between .1 and .6
    // This check must come BEFORE the general decimal check
    if (trimmed.startsWith('.') && trimmed.length <= 3) {
      const decimal = parseFloat(trimmed);
      if (!isNaN(decimal) && decimal >= 0.1 && decimal <= 0.6) {
        const minutes = Math.round(decimal * 10);
        return formatMinutesToTime(minutes);
      }
    }

    // If it's a decimal (like 8.5 or 1.5), convert to HH:MM
    // This handles numbers like "1.5", "8.5", "2.25", etc.
    if (trimmed.includes(".") && !trimmed.startsWith('.')) {
      const decimal = parseFloat(trimmed);
      if (!isNaN(decimal)) {
        const hours = Math.floor(Math.abs(decimal));
        const fractionalPart = Math.abs(decimal) % 1;
        const minutes = Math.round(fractionalPart * 60);
        return formatMinutesToTime(hours * 60 + minutes);
      }
    }

    // If it's just a number (no decimal point), convert to HH:MM format (treat as hours)
    if (!trimmed.includes(".")) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        return formatMinutesToTime(Math.round(Math.abs(num) * 60));
      }
    }

    return trimmed;
  };

  // Validate time doesn't exceed 24 hours per day
  const validateTime = (timeStr, rowId, dayIndex) => {
    const errorKey = `${rowId}_${dayIndex}`;
    const minutes = parseTimeToMinutes(timeStr);
    const hours = minutes / 60;

    // Clear error if time is empty
    if (!timeStr || !timeStr.trim()) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
      return true;
    }

    // Check if exceeds 24 hours
    if (hours > 24) {
      const date = weekDates[dayIndex];
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const errorMsg = `Your logged time exceeds the maximum limit of 24:00 hour(s) for ${dateStr}.`;
      setErrors(prev => ({ ...prev, [errorKey]: errorMsg }));
      toast.error(errorMsg);
      return false;
    }

    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });
    return true;
  };

  // Update row data
  const updateRow = (rowId, field, value, shouldFormat = false) => {
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          if (field.startsWith("day")) {
            const dayIndex = parseInt(field.replace("day", ""));
            const newDays = [...row.days];

            // Only format if explicitly requested (on blur)
            const finalValue = shouldFormat ? formatTimeInput(value) : value;
            newDays[dayIndex] = finalValue;

            // Validate time
            if (shouldFormat) {
              validateTime(finalValue, rowId, dayIndex);
            }

            const total = calculateTotal(newDays);
            return { ...row, days: newDays, total };
          } else {
            return { ...row, [field]: value };
          }
        }
        return row;
      })
    );
  };

  // Calculate total time from days array
  const calculateTotal = (days) => {
    let totalMinutes = 0;
    days.forEach((day) => {
      totalMinutes += parseTimeToMinutes(day);
    });
    return formatMinutesToTime(totalMinutes);
  };

  // Calculate day totals
  const calculateDayTotals = () => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    rows.forEach((row) => {
      row.days.forEach((day, index) => {
        totals[index] += parseTimeToMinutes(day);
      });
    });
    return totals.map((minutes) => formatMinutesToTime(minutes));
  };

  const dayTotals = calculateDayTotals();
  const grandTotal = dayTotals.reduce((acc, time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return acc + hours * 60 + minutes;
  }, 0);
  const grandTotalHours = Math.floor(grandTotal / 60);
  const grandTotalMinutes = grandTotal % 60;
  const grandTotalFormatted = `${grandTotalHours.toString().padStart(2, "0")}:${grandTotalMinutes.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              className="bg-transparent border-none cursor-pointer p-1 flex items-center text-gray-700 hover:text-gray-900"
              onClick={() => navigate("/time-tracking/timesheet")}
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 m-0">Weekly Time Log</h1>
          </div>
          <button
            className="bg-transparent border-none cursor-pointer p-1 flex items-center text-red-500 hover:text-red-600"
            onClick={() => navigate("/time-tracking/timesheet")}
          >
            <X size={20} />
          </button>
        </div>
        <div className="text-sm text-gray-600 mb-3">Year : {year}</div>
        <div className="flex items-center justify-center gap-3">
          <button
            className="bg-transparent border-none cursor-pointer p-1 flex items-center text-gray-700 hover:text-gray-900"
            onClick={goToPreviousWeek}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-base font-medium text-gray-900 min-w-[250px] text-center">
            {formatDate(weekDates[0]).month} {formatDate(weekDates[0]).date} - {formatDate(weekDates[6]).month} {formatDate(weekDates[6]).date}
          </div>
          <button
            className="bg-transparent border-none cursor-pointer p-1 flex items-center text-gray-700 hover:text-gray-900"
            onClick={goToNextWeek}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-red-500 font-bold text-lg">⚠</div>
              <div className="text-red-700 text-sm">
                {Object.values(errors)[0]}
              </div>
            </div>
            <button
              onClick={() => setErrors({})}
              className="text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <table className="w-full border-collapse border border-gray-200 rounded-md overflow-hidden">
          <thead>
            <tr>
              <th className="bg-gray-50 p-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">PROJECT</th>
              <th className="bg-gray-50 p-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">TASK</th>
              {weekDates.map((date, index) => {
                const formatted = formatDate(date);
                return (
                  <th key={index} className="bg-gray-50 p-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                    {formatted.day} {formatted.date} {formatted.month}
                  </th>
                );
              })}
              <th className="bg-gray-50 p-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">BILLABLE</th>
              <th className="bg-gray-50 p-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">TOTAL</th>
              <th className="bg-gray-50 p-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tasks = row.project ? getTasksForProject(row.project) : [];
              return (
                <tr key={row.id}>
                  <td className="p-3 border-b border-gray-200 text-sm">
                    <select
                      className="w-full p-2 border border-gray-300 rounded text-sm bg-white cursor-pointer"
                      value={row.project}
                      onChange={(e) => updateRow(row.id, "project", e.target.value)}
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.projectName}>
                          {project.projectName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 border-b border-gray-200 text-sm">
                    <select
                      className="w-full p-2 border border-gray-300 rounded text-sm bg-white cursor-pointer"
                      value={typeof row.task === 'string' ? row.task : (row.task?.taskName || row.task?.name || '')}
                      onChange={(e) => updateRow(row.id, "task", e.target.value)}
                      disabled={!row.project}
                    >
                      <option value="">Select task</option>
                      {tasks.filter(task => task != null).map((task, index) => {
                        // Handle both string and object formats
                        let taskName = 'Untitled Task';
                        let taskValue = '';

                        if (typeof task === 'string') {
                          taskName = task;
                          taskValue = task;
                        } else if (task && typeof task === 'object') {
                          taskName = task.taskName || task.name || String(task.id || index) || 'Untitled Task';
                          taskValue = task.taskName || task.name || String(task.id || index) || '';
                        }

                        // Ensure we always have strings
                        const displayName = String(taskName || 'Untitled Task');
                        const optionValue = String(taskValue || '');

                        return (
                          <option key={index} value={optionValue}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  {row.days.map((day, dayIndex) => {
                    const errorKey = `${row.id}_${dayIndex}`;
                    const hasError = errors[errorKey];
                    return (
                      <td key={dayIndex} className="p-3 border-b border-gray-200 text-sm relative">
                        <input
                          type="text"
                          className={`w-full p-2 border rounded text-sm text-center ${hasError
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-[#156372] focus:ring-1 focus:ring-[#156372]'
                            }`}
                          value={day}
                          onChange={(e) => updateRow(row.id, `day${dayIndex}`, e.target.value, false)}
                          onBlur={(e) => {
                            // Format and validate on blur
                            const formatted = formatTimeInput(e.target.value);
                            updateRow(row.id, `day${dayIndex}`, formatted, true);
                          }}
                          onMouseLeave={(e) => {
                            // Also format when mouse leaves (if not focused)
                            if (document.activeElement !== e.target) {
                              const formatted = formatTimeInput(e.target.value);
                              if (formatted !== e.target.value) {
                                updateRow(row.id, `day${dayIndex}`, formatted, true);
                              }
                            }
                          }}
                          placeholder="00:00"
                        />
                        {hasError && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700 whitespace-nowrap shadow-lg">
                            {errors[errorKey]}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 border-b border-gray-200 text-sm">
                    <input
                      type="checkbox"
                      className="w-[18px] h-[18px] cursor-pointer"
                      checked={row.billable}
                      onChange={(e) => updateRow(row.id, "billable", e.target.checked)}
                    />
                  </td>
                  <td className="p-3 border-b border-gray-200 text-sm">{row.total}</td>
                  <td className="p-3 border-b border-gray-200 text-sm">
                    <button className="bg-transparent border-none cursor-pointer p-1 flex items-center text-red-500 hover:text-red-600" onClick={() => deleteRow(row.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* Total Row */}
            <tr className="bg-gray-50 font-semibold">
              <td className="p-3 border-b border-gray-200 text-sm" colSpan={2}>
                <strong>TOTAL</strong>
              </td>
              {dayTotals.map((total, index) => (
                <td key={index} className="p-3 border-b border-gray-200 text-sm">
                  <strong>{total}</strong>
                </td>
              ))}
              <td className="p-3 border-b border-gray-200 text-sm"></td>
              <td className="p-3 border-b border-gray-200 text-sm">
                <strong>{grandTotalFormatted}</strong>
              </td>
              <td className="p-3 border-b border-gray-200 text-sm"></td>
            </tr>
          </tbody>
        </table>

        {/* Actions */}
        <div className="flex justify-between items-center mt-6">
          <button className="px-5 py-2.5 text-white border-none rounded-md cursor-pointer text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity bg-[linear-gradient(90deg,#156372_0%,#0D4A52_100%)]" onClick={addNewRow}>
            <Plus size={16} />
            Add New Row
          </button>
          <a
            href="#"
            className="text-[#156372] no-underline text-sm flex items-center gap-1 cursor-pointer hover:text-[#0D4A52]"
            onClick={(e) => {
              e.preventDefault();
              toast(
                <div className="text-sm">
                  <div className="font-semibold mb-2 text-[#156372]">Supported Time Formats:</div>
                  <div className="space-y-1 text-gray-700">
                    <div>• 2:50 - Two hours and fifty minutes</div>
                    <div>• 10:5 - Ten hours and five minutes</div>
                    <div>• :35 - Thirty five minutes</div>
                    <div>• 3.5 - Three hours and thirty minutes</div>
                    <div>• 4.75 - Four hours and forty five minutes</div>
                    <div>• .5 - Thirty minutes</div>
                    <div>• 7 - Seven hours</div>
                  </div>
                </div>,
                {
                  duration: 5000,
                  style: {
                    background: '#156372',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                  },
                }
              );
            }}
          >
            <Info size={16} />
            Supported Time Formats
          </a>
        </div>
      </div>

      {/* Footer with Save and Cancel buttons */}
      <div className="px-6 py-4 border-t border-gray-200 flex gap-3 items-center bg-white">
        <button
          className="px-6 py-2.5 text-white border-none rounded-md cursor-pointer text-sm font-semibold hover:opacity-90 transition-colors bg-[linear-gradient(90deg,#156372_0%,#0D4A52_100%)]"
          onClick={async () => {
            try {
              // Get current user
              const currentUser = getCurrentUser();
              if (!currentUser) {
                toast.error('User not found. Please log in again.');
                return;
              }

              const newEntries = [];

              // Convert weekly log rows to individual time entries
              for (const row of rows) {
                if (row.project && row.task) {
                  for (let dayIndex = 0; dayIndex < row.days.length; dayIndex++) {
                    const dayTime = row.days[dayIndex];
                    if (dayTime && dayTime.trim() !== '') {
                      const entryDate = new Date(weekDates[dayIndex]);

                      // Find project
                      const projectObj = projects.find(p =>
                        (p.projectName || p.name) === row.project ||
                        p._id === row.project ||
                        p.id === row.project
                      );

                      if (!projectObj) {
                        console.warn(`Project not found: ${row.project}`);
                        continue;
                      }

                      // Parse time (HH:MM format)
                      const [hours, minutes] = dayTime.trim().split(':').map(Number);

                      // Create time entry for backend
                      const newEntry = {
                        project: projectObj.id,
                        user: currentUser.id,
                        date: entryDate.toISOString(),
                        hours: hours || 0,
                        minutes: minutes || 0,
                        description: '',
                        billable: row.billable !== undefined ? row.billable : true,
                        task: typeof row.task === 'string' ? row.task : (row.task?.taskName || row.task?.name || ''),
                      };

                      newEntries.push(newEntry);
                    }
                  }
                }
              }

              // Save all entries to database
              await Promise.all(newEntries.map(entry => timeEntriesAPI.create(entry)));

              // Dispatch custom event to notify other components
              window.dispatchEvent(new CustomEvent('timeEntryUpdated'));

              toast.success(`Successfully saved ${newEntries.length} time entr${newEntries.length > 1 ? 'ies' : 'y'}`);

              // Navigate to timesheet list page
              navigate("/time-tracking/timesheet");
            } catch (error) {
              console.error("Error saving time entries:", error);
              toast.error("Failed to save time entries: " + (error.message || "Unknown error"));
            }
          }}
        >
          Save
        </button>
        <button
          className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-md cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors"
          onClick={() => navigate("/time-tracking/timesheet")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
