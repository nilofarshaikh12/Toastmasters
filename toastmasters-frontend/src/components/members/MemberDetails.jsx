import { useState } from "react";
import MemberTable from "./MemberTable";
import MemberForm from "./MemberForm";

function MemberDetails() {
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [refresh, setRefresh] = useState(false);

  const handleEdit = (member) => {
    setEditingMember(member);
    setShowModal(true);
  };

  const refreshMembers = () => setRefresh(!refresh);

  return (
    <>
      <MemberTable onEdit={handleEdit} refresh={refresh} />
      <MemberForm
        show={showModal}
        handleClose={() => setShowModal(false)}
        member={editingMember}
        refreshMembers={refreshMembers}
      />
    </>
  );
}

export default MemberDetails;
