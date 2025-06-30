package com.kosa.recruit.domain.entity;

import java.util.List;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@DiscriminatorValue("APPLICANT")     // APPLICANT
@Table(name = "applicantuser")
@Getter @Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantUser extends User{
    
    private String resumeFilePath;

    @OneToMany(mappedBy = "user")
    private List<Job> jobs;
}
