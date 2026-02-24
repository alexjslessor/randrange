import React, { useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import {
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

const PAGE_SIZES = [10, 25, 50];
const SERVER_SORTABLE_COLUMN_IDS = ['group_name', 'username', 'deployment_name'];

const PermissionBadges = ({ values, color }) => (
  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
    {(values || []).map((v) => (
      <span
        key={v}
        style={{
          fontSize: 11,
          padding: '1px 6px',
          borderRadius: 10,
          background: color,
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        {v}
      </span>
    ))}
  </span>
);

const COLUMNS = [
  {
    accessorKey: 'group_name',
    header: 'Group',
    enableGrouping: true,
  },
  {
    accessorKey: 'username',
    header: 'User',
    enableGrouping: true,
  },
  {
    accessorKey: 'deployment_name',
    header: 'Deployment',
    enableGrouping: true,
  },
  {
    accessorKey: 'group_permissions',
    header: 'Group Permissions',
    enableGrouping: false,
    enableSorting: false,
    cell: ({ getValue }) => <PermissionBadges values={getValue()} color="#2e7d32" />,
    aggregatedCell: () => null,
  },
  {
    accessorKey: 'direct_user_permissions',
    header: 'User Permissions',
    enableGrouping: false,
    enableSorting: false,
    cell: ({ getValue }) => <PermissionBadges values={getValue()} color="#0288d1" />,
    aggregatedCell: () => null,
  },
  {
    accessorKey: 'effective_permissions',
    header: 'Effective Permissions',
    enableGrouping: false,
    enableSorting: false,
    cell: ({ getValue }) => <PermissionBadges values={getValue()} color="#1565c0" />,
    aggregatedCell: () => null,
  },
  // {
  //   accessorKey: 'source',
  //   header: 'Source',
  //   enableGrouping: false,
  // },
];

export default function GroupTable({
  data = [],
  initialGrouping = [],
  onEdit,
  onAssignDeploymentPermissions,
  isAssignDeploymentPermissionsDisabled,
  disableAssignDeploymentPermissions = false,
  onCreateUser,
  disableCreateUser = false,
  onCreateGroup,
  disableCreateGroup = false,
  pageIndex = 0,
  pageSize = 25,
  totalRows = 0,
  onPageChange,
  onPageSizeChange,
  sortBy = 'group_name',
  sortDir = 'asc',
  onSortChange,
  isLoading = false,
}) {
  const theme = useTheme();
  const t = theme.palette;
  const [grouping, setGrouping] = useState(initialGrouping);
  const brandBlue = '#0075be';

  const BADGE_COLORS = {
    group:     t.green?.main     ?? '#19ab09',
    user:      t.cyberAqua?.main ?? 'rgba(0,203,221,0.65)',
    effective: t.primary?.dark   ?? '#67bbf9',
  };
  const isServerPagination = typeof onPageChange === 'function' && typeof onPageSizeChange === 'function';
  const isServerSorting = typeof onSortChange === 'function';

  const handleSortToggle = (columnId) => {
    if (!isServerSorting || !SERVER_SORTABLE_COLUMN_IDS.includes(columnId)) return;
    const nextSortDir = sortBy === columnId && sortDir === 'asc' ? 'desc' : 'asc';
    onSortChange({ sortBy: columnId, sortDir: nextSortDir });
  };

  const columns = useMemo(
    () => [
      ...COLUMNS.slice(0, 3),
      { ...COLUMNS[3], cell: ({ getValue }) => <PermissionBadges values={getValue()} color={BADGE_COLORS.group} /> },
      { ...COLUMNS[4], cell: ({ getValue }) => <PermissionBadges values={getValue()} color={BADGE_COLORS.user} /> },
      { ...COLUMNS[5], cell: ({ getValue }) => <PermissionBadges values={getValue()} color={BADGE_COLORS.effective} /> },
      {
        id: 'actions',
        header: 'Actions',
        enableGrouping: false,
        enableSorting: false,
        aggregatedCell: () => null,
        cell: ({ row }) => {
          const canAssignDeploymentPermissions = typeof onAssignDeploymentPermissions === 'function';
          const assignDisabled = disableAssignDeploymentPermissions
            || !row.original?.user_id
            || Boolean(isAssignDeploymentPermissionsDisabled?.(row.original));
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Edit user">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Edit user"
                    disabled={!onEdit}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit?.(row.original);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              {canAssignDeploymentPermissions ? (
                <Tooltip title="Assign deployment permissions">
                  <span>
                    <IconButton
                      size="small"
                      color="secondary"
                      aria-label="Assign deployment permissions"
                      disabled={assignDisabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        onAssignDeploymentPermissions?.(row.original);
                      }}
                    >
                      <AdminPanelSettingsOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Box>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      BADGE_COLORS.group,
      BADGE_COLORS.user,
      BADGE_COLORS.effective,
      disableAssignDeploymentPermissions,
      isAssignDeploymentPermissionsDisabled,
      onAssignDeploymentPermissions,
      onEdit,
    ],
  );

  const s = {
    wrapper:   { overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.11)', background: `linear-gradient(160deg, rgba(0,117,190,0.14), rgba(143,42,163,0.06) 45%, rgba(255,255,255,0.02))`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 48px rgba(0,0,0,0.35)' },
    table:     { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: t.text?.primary ?? 'rgb(216,216,216)' },
    thead:     { background: `linear-gradient(90deg, rgba(0,117,190,0.28), rgba(143,42,163,0.12))`, boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.10)' },
    th:        { padding: '9px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.10)', whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: '0.02em', fontSize: 12 },
    rowEven:   { background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    rowOdd:    { background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td:        { padding: '6px 12px' },
    tdGrouped: { padding: '6px 12px', background: 'rgba(0,117,190,0.18)' },
    tdAgg:     { padding: '6px 12px', background: 'rgba(143,42,163,0.12)' },
    tdPlaceholder: { padding: '6px 12px', background: 'rgba(255,255,255,0.02)' },
    groupBtn:  { cursor: 'pointer', border: 'none', background: 'none', fontWeight: 700, color: t.cyberAqua?.main ?? 'rgba(0,203,221,0.65)', fontSize: 13 },
    groupToggleActive:   { cursor: 'pointer', border: `1px solid ${brandBlue}`, background: `rgba(0,117,190,0.35)`, color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 11 },
    groupToggleInactive: { cursor: 'pointer', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', borderRadius: 4, padding: '1px 7px', fontSize: 11 },
    sortBtn: { cursor: 'pointer', border: 'none', background: 'none', color: t.text?.primary ?? '#d8d8d8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, fontSize: 12 },
    sortIndicator: { fontSize: 11, color: t.cyberAqua?.main ?? '#00cbdd' },
    headerActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 12px 4px' },
    createUserBtn: {
      color: t.cyberAqua?.main ?? '#00cbdd',
      border: '1px solid rgba(0, 203, 221, 0.45)',
      background: 'linear-gradient(135deg, rgba(0, 203, 221, 0.2), rgba(143, 42, 163, 0.15))',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)',
      '&:hover': {
        color: t.cyberAqua?.main ?? '#00cbdd',
        borderColor: 'rgba(0, 203, 221, 0.7)',
        background: 'linear-gradient(135deg, rgba(0, 203, 221, 0.32), rgba(143, 42, 163, 0.24))',
      },
    },
    footer:    { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 13, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.02)' },
    pageBtn:   { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: t.text?.primary ?? '#d8d8d8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 13 },
    loading:   { color: t.text?.secondary ?? 'rgba(236,232,232,0.6)' },
    rowCount:  { color: t.text?.secondary ?? 'rgba(236,232,232,0.6)', marginLeft: 'auto' },
  };
  const footerSelectSx = theme.customStyles?.dashboard?.table?.footerSelect ?? {
    minWidth: 92,
    height: 28,
    px: 1,
    borderRadius: 1,
    color: t.text?.primary ?? '#d8d8d8',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    outline: 'none',
    cursor: 'pointer',
    '& option': {
      backgroundColor: t.background?.paper ?? '#080707',
      color: t.text?.primary ?? '#d8d8d8',
    },
  };

  const tableOptions = {
    data,
    columns,
    state: { grouping },
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  };
  if (!isServerPagination) {
    tableOptions.getPaginationRowModel = getPaginationRowModel();
    tableOptions.initialState = { pagination: { pageSize: 25 } };
  }

  const table = useReactTable(tableOptions);
  const localPagination = table.getState().pagination;
  const currentPageIndex = isServerPagination ? pageIndex : (localPagination?.pageIndex || 0);
  const currentPageSize = isServerPagination ? pageSize : (localPagination?.pageSize || 25);
  const currentTotalRows = isServerPagination ? totalRows : table.getFilteredRowModel().rows.length;
  const currentPageCount = isServerPagination
    ? Math.max(1, Math.ceil(currentTotalRows / Math.max(currentPageSize, 1)))
    : Math.max(1, table.getPageCount());
  const canPreviousPage = isServerPagination
    ? currentPageIndex > 0
    : table.getCanPreviousPage();
  const canNextPage = isServerPagination
    ? (currentPageIndex + 1) < currentPageCount
    : table.getCanNextPage();

  const setPageIndex = (nextPageIndex) => {
    if (isServerPagination) {
      const clampedPageIndex = Math.max(
        0,
        Math.min(nextPageIndex, Math.max(currentPageCount - 1, 0)),
      );
      onPageChange(clampedPageIndex);
      return;
    }
    table.setPageIndex(nextPageIndex);
  };

  const setPageSize = (nextPageSize) => {
    if (isServerPagination) {
      onPageSizeChange(nextPageSize);
      return;
    }
    table.setPageSize(nextPageSize);
  };

  return (
    <div style={s.wrapper}>
      {onCreateUser || onCreateGroup ? (
        <div style={s.headerActions}>
          {onCreateUser ? (
            <Tooltip title="Create user">
              <span>
                <IconButton
                  onClick={onCreateUser}
                  disabled={disableCreateUser}
                  aria-label="Create user"
                  sx={s.createUserBtn}
                >
                  <PersonAddIcon />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {onCreateGroup ? (
            <Tooltip title="Create group">
              <span>
                <IconButton
                  onClick={onCreateGroup}
                  disabled={disableCreateGroup}
                  aria-label="Create group"
                  sx={s.createUserBtn}
                >
                  <GroupAddIcon />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
      <table style={s.table}>
        <thead style={s.thead}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th key={header.id} colSpan={header.colSpan} style={s.th}>
                  {header.isPlaceholder ? null : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {header.column.getCanGroup() && (
                        <button
                          type="button"
                          onClick={header.column.getToggleGroupingHandler()}
                          title={header.column.getIsGrouped() ? 'Ungroup' : 'Group by this column'}
                          style={header.column.getIsGrouped() ? s.groupToggleActive : s.groupToggleInactive}
                        >
                          {header.column.getIsGrouped() ? '⊟ grouped' : '⊞ group'}
                        </button>
                      )}
                      {isServerSorting && SERVER_SORTABLE_COLUMN_IDS.includes(header.column.id) ? (
                        <button
                          type="button"
                          onClick={() => handleSortToggle(header.column.id)}
                          style={s.sortBtn}
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          <span style={s.sortIndicator}>
                            {sortBy === header.column.id
                              ? (sortDir === 'asc' ? '▲' : '▼')
                              : '↕'}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} style={row.index % 2 === 0 ? s.rowEven : s.rowOdd}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={
                    cell.getIsGrouped() ? s.tdGrouped
                    : cell.getIsAggregated() ? s.tdAgg
                    : cell.getIsPlaceholder() ? s.tdPlaceholder
                    : s.td
                  }
                >
                  {cell.getIsGrouped() ? (
                    <button onClick={row.getToggleExpandedHandler()} style={{ ...s.groupBtn, cursor: row.getCanExpand() ? 'pointer' : 'default' }}>
                      {row.getIsExpanded() ? '▾' : '▸'}{' '}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                    </button>
                  ) : cell.getIsAggregated() ? (
                    flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())
                  ) : cell.getIsPlaceholder() ? null : (
                    flexRender(cell.column.columnDef.cell, cell.getContext())
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={s.footer}>
        <button style={s.pageBtn} onClick={() => setPageIndex(0)} disabled={!canPreviousPage}>{'«'}</button>
        <button style={s.pageBtn} onClick={() => setPageIndex(currentPageIndex - 1)} disabled={!canPreviousPage}>{'‹'}</button>
        <button style={s.pageBtn} onClick={() => setPageIndex(currentPageIndex + 1)} disabled={!canNextPage}>{'›'}</button>
        <button style={s.pageBtn} onClick={() => setPageIndex(currentPageCount - 1)} disabled={!canNextPage}>{'»'}</button>
        <span>Page <strong>{currentPageIndex + 1}</strong> of <strong>{currentPageCount}</strong></span>
        <Box
          component="select"
          sx={footerSelectSx}
          value={currentPageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {PAGE_SIZES.map((ps) => <option key={ps} value={ps}>Show {ps}</option>)}
        </Box>
        {isLoading ? <span style={s.loading}>Loading...</span> : null}
        <span style={s.rowCount}>{currentTotalRows} rows</span>
      </div>
    </div>
  );
}
