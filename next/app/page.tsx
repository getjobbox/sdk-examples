import JobsBoard from '@/components/JobsBoard'

export const metadata = {
  title: 'All Jobs',
}

export default function HomePage() {
  return <JobsBoard pageTitle="All Jobs" lockedCategory="" />
}
