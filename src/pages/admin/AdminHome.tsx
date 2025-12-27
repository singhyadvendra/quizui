export default function AdminHome() {
  return (
    <div>
      <p>Admin workflow:</p>
      <ol>
        <li>Create quiz</li>
        <li>Add questions to the quiz</li>
        <li>Add options to each question</li>
      </ol>

      <p style={{ marginTop: 12 }}>
        If you are not an admin, your backend should return 403 for <code>/api/admin/**</code>.
        If you are not logged in, you will be redirected to login or see 401 depending on config.
      </p>
    </div>
  );
}
