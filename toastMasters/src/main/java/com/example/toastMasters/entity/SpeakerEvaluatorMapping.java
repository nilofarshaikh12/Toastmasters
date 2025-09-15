package com.example.toastMasters.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class SpeakerEvaluatorMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int speakerEvaluatorMappingid;

    @ManyToOne
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @ManyToOne
    @JoinColumn(name = "speaker_id", nullable = false)
    private Member speaker;

    @ManyToOne
    @JoinColumn(name = "evaluator_id", nullable = false)
    private Member evaluator;
}
