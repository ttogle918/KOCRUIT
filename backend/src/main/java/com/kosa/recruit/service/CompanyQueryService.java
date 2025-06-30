package com.kosa.recruit.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.kosa.recruit.domain.entity.Company;
import com.kosa.recruit.dto.company.CompanyDetailDto;
import com.kosa.recruit.dto.company.CompanyListDto;
import com.kosa.recruit.repository.CompanyRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CompanyQueryService {

    private final CompanyRepository companyRepository;

    public CompanyDetailDto createCompany(CompanyDetailDto requestDto) {
        Company company = Company.builder()
                .name(requestDto.getName())
                .address(requestDto.getAddress())
                .build();
        company = companyRepository.save(company);
        return CompanyDetailDto.from(company);
    }

    public CompanyListDto getCompanyByName(String name) {
        return companyRepository.findByName(name)
                .map(CompanyListDto::from)
                .orElse(null);
    }

    public CompanyDetailDto updateCompany(Long id, CompanyDetailDto requestDto) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Company not found with id: " + id));

        company.setName(requestDto.getName());
        company.setAddress(requestDto.getAddress());

        return CompanyDetailDto.from(companyRepository.save(company));
    }

    public List<CompanyListDto> searchCompaniesByName(String keyword ) {
        return companyRepository.findByNameContaining(keyword).stream()
                .map(CompanyListDto::from)
                .collect(Collectors.toList());
    }
    public List<CompanyListDto> searchCompaniesByAddress(String keyword) {
        return companyRepository.findByAddressContaining(keyword).stream()
                .map(CompanyListDto::from)
                .collect(Collectors.toList());
    }
    public void deleteCompany(Long id) {
        companyRepository.deleteById(id);
    }

    public CompanyDetailDto getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Company not found with id: " + id));
        return CompanyDetailDto.from(company);
    }

    public List<CompanyListDto> getAllCompanies() {
        return companyRepository.findAll()
                .stream()
                .map(CompanyListDto::from)
                .collect(Collectors.toList());
                // .toList();
    }
}