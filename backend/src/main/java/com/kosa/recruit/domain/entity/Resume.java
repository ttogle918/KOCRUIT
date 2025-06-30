package com.kosa.recruit.domain.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "resume")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resume {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", 
        foreignKey = @ForeignKey(name = "fk_resume_user"))
    private User user;

    @Column(name = "title", nullable = false)
    private String title;

    @OneToMany(mappedBy = "resume", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Spec> specs = new ArrayList<>();

    @Column(name = "content", length = 4000)
    private String content;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 편의 메서드 추가 가능
    public void addSpec(Spec spec) {
        specs.add(spec);
        spec.setResume(this);
    }

    public void removeSpec(Spec spec) {
        specs.remove(spec);
        spec.setResume(null);
    }

}