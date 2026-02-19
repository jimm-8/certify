import { useEffect, useState } from "react";
import requestService from "../../../services/requestService";

export default function RequestsTable() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await requestService.getAllRequests({
        page: 1,
        limit: 10
      });

      setRequests(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((req) => (
          <tr key={req.id}>
            <td>{req.student_name}</td>
            <td>{req.status}</td>
            <td>{req.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}