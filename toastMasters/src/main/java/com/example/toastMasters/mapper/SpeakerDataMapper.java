package com.example.toastMasters.mapper;

import com.example.toastMasters.dto.SpeakerDataRequestDTO;
import com.example.toastMasters.dto.SpeakerDataResponseDTO;
import com.example.toastMasters.entity.Meeting;
import com.example.toastMasters.entity.Member;
import com.example.toastMasters.entity.SpeakerData;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface SpeakerDataMapper {

    @Mapping(target = "speakerId", ignore = true) // ID is auto-generated
    @Mapping(target = "member", source = "memberId", qualifiedByName = "mapMember")
    @Mapping(target = "meeting", source = "meetingId", qualifiedByName = "mapMeeting")
    SpeakerData toEntity(SpeakerDataRequestDTO dto);

    @Mapping(target = "memberId", source = "member.memberId")
    @Mapping(target = "meetingId", source = "meeting.meetingId")
    SpeakerDataResponseDTO toResponseDTO(SpeakerData entity);


    @Named("mapMember")
    default Member mapMember(int memberId) {
        Member member = new Member();
        member.setMemberId(memberId);
        return member;
    }

    @Named("mapMeeting")
    default Meeting mapMeeting(String meetingId) {
        Meeting meeting = new Meeting();
        meeting.setMeetingId(meetingId);
        return meeting;
    }
}
