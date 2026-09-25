function buildTrivyTableColumns() {
  return [
    'vulnerability_id',
    'package_name',
    'installed_version',
    'fixed_version',
    'severity',
    'status',
    'title',
    'target',
    'type',
    'published_date',
    'last_modified_date',
    'primary_url',
  ];
}

function normalizeTrivyRows(rows = []) {
  return rows.map((row) => ({
    ...row,
    vulnerability_id: row.vulnerability_id ?? row.VulnerabilityID ?? '',
    package_name: row.package_name ?? row.PkgName ?? '',
    installed_version: row.installed_version ?? row.InstalledVersion ?? '',
    fixed_version: row.fixed_version ?? row.FixedVersion ?? '',
    severity: row.severity ?? row.Severity ?? '',
    status: row.status ?? row.Status ?? '',
    title: row.title ?? row.Title ?? '',
    target: row.target ?? row.Target ?? '',
    type: row.type ?? row.Type ?? row.Class ?? '',
    published_date: row.published_date ?? row.PublishedDate ?? '',
    last_modified_date: row.last_modified_date ?? row.LastModifiedDate ?? '',
    primary_url: row.primary_url ?? row.PrimaryURL ?? '',
  }));
}

module.exports = {
  buildTrivyTableColumns,
  normalizeTrivyRows,
};
