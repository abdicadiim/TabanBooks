import React, { useEffect, useRef, useState } from "react";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import SettingsLayout from "./SettingsLayout";

function TasksSettingsPage() {
  const [taskCompletionNotify, setTaskCompletionNotify] = useState(true);
  const [reminderNotify, setReminderNotify] = useState(true);
  const [alertType, setAlertType] = useState("Email");
  const [remindBeforeValue, setRemindBeforeValue] = useState("1");
  const [remindBeforeUnit, setRemindBeforeUnit] = useState("Days");
  const [remindBeforeOpen, setRemindBeforeOpen] = useState(false);
  const remindBeforeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (remindBeforeRef.current && !remindBeforeRef.current.contains(event.target as Node)) {
        setRemindBeforeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const alertTypeOptions = [
    { value: "Email", label: "Email" },
    { value: "In-app Notification", label: "In-app Notification" },
    { value: "Email & In-app Notification", label: "Email & In-app Notification" },
  ];
  const remindBeforeOptions = ["Days", "Monthly", "Years"];

  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        </div>

        <div className="space-y-8">
          <section className="border-b border-gray-200 pb-6">
            <div className="mb-4">
              <h2 className="text-xl font-medium text-gray-900">Task Completion Notify</h2>
            </div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={taskCompletionNotify}
                onChange={(event) => setTaskCompletionNotify(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-base text-gray-900">
                  Notify users once the status is changed to Completed
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  An email and an in-app notification will be sent to the users associated with
                  each task when a task&apos;s status is updated to Completed
                </div>
              </div>
            </label>
          </section>

          <section className="pb-2">
            <div className="mb-4">
              <h2 className="text-xl font-medium text-gray-900">Set Reminder Notify</h2>
            </div>
            <label className="mb-6 flex items-start gap-3">
              <input
                type="checkbox"
                checked={reminderNotify}
                onChange={(event) => setReminderNotify(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-base text-gray-900">Set the default preference for reminder</div>
                <div className="mt-1 text-sm text-gray-500">
                  The reminder preference that you configure here will auto-populate when you
                  create a task and enable reminder for it
                </div>
              </div>
            </label>

            {reminderNotify && (
              <div className="max-w-md space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Alert Type</label>
                  <SearchableDropdown
                    options={alertTypeOptions}
                    value={alertType}
                    onChange={setAlertType}
                    placeholder="Select alert type"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Remind Before
                  </label>
                  <div
                    className="flex max-w-[300px] items-stretch rounded-md border border-gray-300 bg-white shadow-sm"
                  >
                    <input
                      type="number"
                      min="1"
                      value={remindBeforeValue}
                      onChange={(event) => setRemindBeforeValue(event.target.value)}
                      className="w-full border-0 px-3 py-2 text-sm focus:outline-none"
                    />
                    <div className="relative min-w-[90px] border-l border-gray-300" ref={remindBeforeRef}>
                      <button
                        type="button"
                        onClick={() => setRemindBeforeOpen((open) => !open)}
                        className="flex h-full w-full items-center justify-between gap-2 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none"
                      >
                        <span className="truncate">{remindBeforeUnit}</span>
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M5 8l5 5 5-5"
                            stroke="#6b7280"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {remindBeforeOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-[116px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                          {remindBeforeOptions.map((option) => {
                            const isSelected = remindBeforeUnit === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setRemindBeforeUnit(option);
                                  setRemindBeforeOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                                  isSelected
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span>{option}</span>
                                {isSelected ? <span className="text-xs font-semibold text-gray-500">&#10003;</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center rounded-md bg-[#0f5f73] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0b4f60]"
                >
                  Save
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function SettingsTasksWrapper() {
  return (
    <SettingsLayout>
      <TasksSettingsPage />
    </SettingsLayout>
  );
}
