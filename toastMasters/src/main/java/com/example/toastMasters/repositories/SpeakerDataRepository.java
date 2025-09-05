package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.SpeakerData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakerDataRepository extends JpaRepository<SpeakerData, Integer> {

  //  List<SpeakerData> findById(int id);

    List<SpeakerData> findByMember_MemberId(int memberId);

    List<SpeakerData> findByMeeting_MeetingId(String meetingId);
    List<SpeakerData> findAllByMemberAndMeeting(Member member, Meeting meeting);
}
