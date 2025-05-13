package com.ohammer.apartner.domain.user.repository;

import com.ohammer.apartner.domain.user.entity.Role;
import com.ohammer.apartner.domain.user.entity.User;
import io.lettuce.core.dynamic.annotation.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = "roles")
    Optional<User> findByUserName(String userName);

    boolean existsByUserName(String userName); //아이디 중복확인

    @EntityGraph(attributePaths = "roles")
    Optional<User> findByEmail(String email); // 이메일로 사용자 찾는 메소드 추가

    boolean existsByEmail(String email); // 이메일 중복 확인 메서드 추가

    boolean existsByPhoneNum(String phoneNum);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.userName = :username")
    Optional<User> findByUserNameWithRoles(@Param("username") String username);

    @EntityGraph(attributePaths = "roles") // 🎯 roles 컬렉션을 함께 로딩
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithRoles(@Param("id") Long id);

    Optional<User> findByPhoneNum(String testPhone);

    Page<User> findAllByRoles(Role role, Pageable pageable);

    Page<User> findAllUserByRoles(Role role, Pageable pageable);

    // EntityGraph 추가: /me 에서 필요
    @Override
    @EntityGraph(attributePaths = {"roles", "apartment", "building", "unit", "profileImage"})
    Optional<User> findById(Long id);
}
