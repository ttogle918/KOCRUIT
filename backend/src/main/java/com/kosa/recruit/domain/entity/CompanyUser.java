package com.kosa.recruit.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.ForeignKey;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@DiscriminatorValue("COMPANY")    // DB의 User_type. JPA가 자동으로 채움
@Table(name = "companyuser")
@Getter @Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyUser extends User {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", foreignKey = @ForeignKey(name = "fk_companyuser_company"))
    private Company company;

    @Column(name = "bus_num")
    private String businessNumber;

    @ManyToOne
    @JoinColumn(name = "department_id", 
        foreignKey = @ForeignKey(name = "fk_companyuser_department"))
    private Department department;

    @Column(name = "rank")
    private String rank;
}