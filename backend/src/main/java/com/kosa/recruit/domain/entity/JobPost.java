package com.kosa.recruit.domain.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "jobpost")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id",
        foreignKey = @ForeignKey(name = "fk_jobpost_company"))
    private Company company;

    private String department;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "qualifications", length = 4000)
    private String qualifications;

    @Column(name = "conditions", length = 4000)
    private String conditions;

    @Column(name = "job_details", length = 4000)
    private String jobDetails;

    @Column(name = "procedure", length = 4000)
    private String procedure;

    @Column(name = "headcount")
    private Integer headcount;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @ManyToOne( fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id",
        foreignKey = @ForeignKey(name = "fk_jobpost_user"))
    private CompanyUser user;

    @OneToMany(mappedBy = "jobPost" , fetch = FetchType.LAZY)
    private List<Job> teamMembers;

    @OneToMany(mappedBy = "jobPost", fetch = FetchType.LAZY)
    private List<Weight> weights;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public JobPost(Long id, String department, String title) {
        this.id = id;
        this.department = department;
        this.title = title;
    }
}
