import React, { useState, useEffect } from "react";
import { getCurrentUser } from "../../services/auth";

export default function HomeHeader() {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.name) {
      setUserName(user.name.toUpperCase());
    }
  }, []);

  return (
    <section className="px-4 py-4 box-border overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[32px] md:text-[36px] leading-none font-semibold text-slate-900 tracking-tight">
            Hello, <span className="text-[#156372]">{userName}</span>
          </h1>
          <p className="mt-2 text-[13px] text-[#55737a]">
            Manage your business finances and cash flow at a glance.
          </p>
        </div>
      </div>
    </section>
  );
}

