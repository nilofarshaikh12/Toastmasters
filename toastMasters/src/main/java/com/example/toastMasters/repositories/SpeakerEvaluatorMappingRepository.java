package com.example.toastMasters.repositories;

import com.example.toastMasters.entity.SpeakerEvaluatorMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpeakerEvaluatorMappingRepository extends JpaRepository<SpeakerEvaluatorMapping, Integer> {
    List<SpeakerEvaluatorMapping> findByMeeting_MeetingId(String meetingId);
    List<SpeakerEvaluatorMapping> findBySpeaker_MemberId(int memberId);
    List<SpeakerEvaluatorMapping> findByEvaluator_MemberId(int memberId);
    boolean existsByMeeting_MeetingIdAndSpeaker_MemberIdAndEvaluator_MemberId(String meetingId, int speakerId, int evaluatorId);
    void deleteByMeeting_MeetingIdAndSpeaker_MemberIdAndEvaluator_MemberId(String meetingId, int speakerId, int evaluatorId);

}
