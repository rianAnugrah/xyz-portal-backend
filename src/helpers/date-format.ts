// // utils/date-format.ts

// /**
//  * Formats a date string or Date object into "MMM DD YYYY" format (e.g., "Mar 14 2025").
//  * @param date - The date to format (string, Date, or null/undefined)
//  * @returns Formatted date string or null if input is invalid
//  */
// export function formatDate(date: string | Date | null | undefined): string | null {
//     if (!date) return null;
  
//     const dateObj = new Date(date);
//     if (isNaN(dateObj.getTime())) return null; // Invalid date check
  
//     return dateObj.toLocaleDateString("en-US", {
//       month: "short", // "Mar"
//       day: "numeric", // "14"
//       year: "numeric", // "2025"
//     });
//   }



// utils/date-format.ts

/**
 * Formats a date string or Date object into "MMM DD YYYY" format (e.g., "Feb 6 2025") without commas.
 * @param date - The date to format (string, Date, or null/undefined)
 * @returns Formatted date string or null if input is invalid
 */
export function formatDate(date: string | Date | null | undefined): string | null {
    if (!date) return null;
  
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null; // Invalid date check
  
    const month = dateObj.toLocaleString("en-US", { month: "short" }); // "Feb"
    const day = dateObj.getDate(); // "6"
    const year = dateObj.getFullYear(); // "2025"
  
    return `${month} ${day} ${year}`; // "Feb 6 2025"
  }