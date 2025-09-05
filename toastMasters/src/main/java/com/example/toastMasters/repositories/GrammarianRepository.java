package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.Grammarian;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GrammarianRepository extends JpaRepository<Grammarian, Integer> {

    List<Grammarian> findByMember_MemberId(int memberId);

    List<Grammarian> findByMeeting_MeetingId(String meetingId);

   // List<Grammarian> findAllByMember_MemberIdAndMeeting_MeetingId(Member member, Meeting meeting);

    List<Grammarian> findAllByMemberAndMeeting(Member grammarianData, Meeting meetingData);
}
