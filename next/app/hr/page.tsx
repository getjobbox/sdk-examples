import JobsBoard from '@/components/JobsBoard'

/** Category slug for HR & People in the JobBox catalog. */
export const HR_CATEGORY_SLUG = 'hr'

export const metadata = {
  title: 'HR Jobs',
}

export default function HrJobsPage() {
  return <JobsBoard pageTitle="HR Jobs" lockedCategory={HR_CATEGORY_SLUG} />
}
