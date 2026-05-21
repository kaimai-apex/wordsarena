import ProfilePage from './profile-page';

export default function Page({ params }: { params: { username: string } }) {
  return <ProfilePage username={params.username} />;
}
