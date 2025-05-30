package com.ohammer.apartner.domain.vehicle.entity;

import com.ohammer.apartner.domain.user.entity.User;
import com.ohammer.apartner.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vehicles")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Setter
public class Vehicle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Column(name = "vehicle_num", length = 10, nullable = false)
    private String vehicleNum;

    @Column(name = "type", length = 225)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Status status;

    @Column(name = "is_foreign")
    private Boolean isForeign;

    // Enum for status
    public enum Status {
        ACTIVE, INACTIVE
    }


    @Column(name = "reason", length = 255)
    private String reason; // 외부 차량일 경우만 사용

    @Column(name = "phone")
    private String phone; // 외부 차량일 경우

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL)
    private List<EntryRecord> entryRecords = new ArrayList<>();


} 