package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.Agenda;
import com.example.toastMasters.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgendaRepository extends JpaRepository<Agenda,Integer> {

    void deleteAllByMeeting(Meeting meeting);
    List<Agenda> findByMeeting_MeetingIdOrderByOrderIndexAsc(String meetingId);
    int countByMeeting(Meeting meeting);
    List<Agenda> findByMember_MemberId(int memberId);

    List<Agenda> findAllByMeeting(Meeting meetingData);
}
