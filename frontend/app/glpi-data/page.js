import { redirect } from 'next/navigation';

export default function LegacyGLPIDataRoute() {
  redirect('/data-sources?tab=agent-data');
}
