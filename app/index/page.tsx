import Dashboard from '../dashboard/page';
import Layout from '../../src/pages/Layout.jsx';

export default function Page() {
  return (
    <Layout currentPageName="Dashboard">
      <Dashboard />
    </Layout>
  );
}
