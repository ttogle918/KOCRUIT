package com.kosa.recruit.domain.entity;

import com.kosa.recruit.domain.enums.SpecType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spec")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Spec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false, 
        foreignKey = @ForeignKey(name = "fk_spec_resume"))
    private Resume resume;

    @Enumerated(EnumType.STRING)
    @Column(name = "spec_type", nullable = false)
    private SpecType specType;

    @Column(name = "spec_title", nullable = false)
    private String specTitle;

    // 여기에 JSON 문자열 저장
    @Column(name = "spec_description", columnDefinition = "CLOB") // Oracle이라면 CLOB 가능, 아니면 length 늘려도 됨
    private String specDescription;
}