import React from "react";

const ItemsTable = ({ items, columns = ["#", "Item & Description", "Qty"], headerColor = "bg-blue-600" }) => {
  const defaultItems = [
    {
      id: 1,
      name: "Brochure Design",
      description: "Brochure Design Single Sided Color",
      qty: 1.00,
      unit: "Nos",
    },
    {
      id: 2,
      name: "Web Design Packages(Template) - Basic",
      description: "Custom Themes for your business. Inclusive of 10 hours of marketing and annual training",
      qty: 1.00,
      unit: "Nos",
    },
    {
      id: 3,
      name: "Print Ad - Basic - Color",
      description: "Print Ad 1/8 size Color",
      qty: 1.00,
      unit: "Nos",
    },
  ];

  const tableItems = items || defaultItems;

  return (
    <table className="w-full">
      <thead className={`${headerColor} text-white`}>
        <tr>
          {columns.map((col) => (
            <th key={col} className="px-4 py-3 text-left text-xs font-semibold">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tableItems.map((item) => (
          <tr key={item.id}>
            <td className="px-4 py-3 text-sm text-gray-700">{item.id}</td>
            <td className="px-4 py-3 text-sm">
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-gray-600 text-xs mt-0.5">{item.description}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
              <div>{item.qty}</div>
              <div className="text-xs text-gray-500">{item.unit}</div>
            </td>
            {columns.includes("Rate") && (
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.rate ? item.rate.toFixed(2) : "0.00"}
              </td>
            )}
            {columns.includes("Amount") && (
              <td className="px-4 py-3 text-sm text-gray-700">
                {item.amount ? item.amount.toFixed(2) : "0.00"}
              </td>
            )}
            {columns.includes("Returned Qty") && (
              <td className="px-4 py-3 text-sm text-gray-700">
                <div>{item.returnedQty || item.qty}</div>
                <div className="text-xs text-gray-500">{item.unit}</div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ItemsTable;

