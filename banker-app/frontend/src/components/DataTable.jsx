/**
 * DataTable component.
 *
 * Reusable table with sorting, empty state, and loading state support.
 *
 * @param {string[]} headers - Array of column header strings.
 * @param {Array} data - Array of row objects.
 * @param {Function} rowKey - Function to extract a unique key from each row.
 * @param {Function} renderRow - Function that returns JSX for a row given the data.
 * @param {boolean} loading - Whether data is currently loading.
 * @param {string} emptyMessage - Message to show when there is no data.
 */

import { Loader2, AlertCircle } from 'lucide-react';

export default function DataTable({
  headers = [],
  data = [],
  rowKey = (row, i) => i,
  renderRow,
  loading = false,
  emptyMessage = 'No data available',
}) {
  if (loading) {
    return (
      <div className="table-loading">
        <Loader2 size={24} className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-empty">
        <AlertCircle size={32} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{data.map((row) => renderRow(row, rowKey(row)))}</tbody>
      </table>
    </div>
  );
}
