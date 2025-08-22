package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting,String> {
    List<Meeting> findAllByDeletedFalse();
    Meeting findByMeetingIdAndDeletedFalse(String meetingId);
}
