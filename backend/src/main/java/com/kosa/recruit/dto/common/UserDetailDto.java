package com.kosa.recruit.dto.common;

import com.kosa.recruit.domain.entity.ApplicantUser;
import com.kosa.recruit.domain.entity.CompanyUser;
import com.kosa.recruit.domain.entity.User;
import com.kosa.recruit.domain.enums.Role;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserDetailDto {
    @Schema(description = "사용자 ID")
    private Long id;
    @Schema(description = "사용자 이름")
    private String name;
    @Schema(description = "사용자 이메일")
    private String email;
    @Schema(description = "사용자 패스워드")
    private String password;
    @Schema(description = "사용자 역할")
    private String role;

    // CompanyUser 전용
    @Schema(description = "회사 ID")
    private Long companyId;
    @Schema(description = "회사명")
    private String companyName;
    @Schema(description = "부서명")
    private String departmentName;
    @Schema(description = "사업자번호")
    private String businessNumber;

    // ApplicantUser 전용
    private String resumeFilePath;

    public UserDetailDto(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole().name();
        this.password = user.getPassword();

        if (user instanceof CompanyUser cu) {
            this.companyId = cu.getCompany() != null ? cu.getCompany().getId() : null;
            this.companyName = cu.getCompany() != null ? cu.getCompany().getName() : null;
            this.departmentName = cu.getDepartment() != null ? cu.getDepartment().getName() : null;
            this.businessNumber = cu.getBusinessNumber() != null ? cu.getBusinessNumber() : null;
        } else if (user instanceof ApplicantUser au) {
            this.resumeFilePath = au.getResumeFilePath();
        }
    }
    public UserDetailDto(Long id, String email, Role role) {

    }
}