/**
 * API 요청을 위한 공통 유틸리티 함수
 * 400, 403 에러는 console.error가 아닌 console.log로 출력되도록 처리
 */

/**
 * API 요청을 위한 기본 URL
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * API 요청 타임아웃 시간 (밀리초)
 */
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000;

let myInfosFetchCount = 0; // myInfos 호출 시도 횟수
const MAX_MYINFOS_FETCH_ATTEMPTS = 3; // 최대 시도 횟수

/**
 * 기본 fetch 함수 래퍼
 * @param url API 엔드포인트 URL
 * @param options fetch 옵션
 * @param preventRedirectOn401 (추가) 401 오류 발생 시 자동 리다이렉트 방지 여부
 * @returns Response 객체
 */
export async function fetchApi(
  url: string,
  options: RequestInit = {},
  preventRedirectOn401: boolean = false // 옵션 추가
): Promise<Response> {
  // 전체 URL 생성 (상대 경로인 경우에만 BASE_URL 추가)
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  // localStorage에서 토큰 가져오기 -> 제거
  // const token =
  //   typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // 기본 옵션
  const defaultOptions: RequestInit = {
    credentials: "include", // 쿠키 전송을 위해 유지
    headers: {}, // 초기 헤더는 비워둡니다.
  };

  // 토큰이 있으면 Authorization 헤더 추가 -> 제거
  // if (token) {
  //   (defaultOptions.headers as Record<string, string>)[
  //     "Authorization"
  //   ] = `Bearer ${token}`;
  // }

  // 요청 본문이 FormData인지 확인
  const isFormData = options.body instanceof FormData;

  // Content-Type 설정: FormData가 아닐 경우에만 기본값 설정
  if (!isFormData) {
    (defaultOptions.headers as Record<string, string>)["Content-Type"] =
      "application/json";
    (defaultOptions.headers as Record<string, string>)["Accept"] =
      "application/json";
  }

  // 기본 옵션과 사용자 지정 옵션 병합
  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    // 사용자 지정 헤더와 기본 헤더(필요한 경우) 병합
    headers: {
      ...defaultOptions.headers, // 인증 헤더 및 기본 Content-Type 등이 포함됨
      ...options.headers,
    },
  };

  // API 요청 실행 및 타임아웃 설정
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT); // 환경 변수로 설정된 타임아웃

    const response = await fetch(fullUrl, {
      ...mergedOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 401 에러 처리 (리다이렉트 방지 옵션 확인)
    if (response.status === 401) {
      // 401 발생 시 항상 토큰 삭제 -> 제거
      // if (typeof window !== "undefined") {
      //   localStorage.removeItem("token");
      //   console.warn(
      //     `[fetchApi DEBUG] Token removed due to 401 Unauthorized on URL: ${url}.`
      //   );
      // }
      // 로그 강화 부분은 유지하거나 필요에 따라 조정 가능
      console.warn(
        `[fetchApi DEBUG] 401 Unauthorized detected for URL: ${url}. PreventRedirect flag is: ${preventRedirectOn401}`
      );

      if (!url.includes("/api/v1/auth/login") && !preventRedirectOn401) {
        // 옵션이 true가 아닐 때만 리다이렉트 (토큰 삭제는 이미 위에서 처리됨)
        console.warn(
          `[fetchApi DEBUG] !!! Redirecting to /login now !!! due to 401 on ${url}`
        );
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      } else {
        // 로그인 페이지 자체이거나 리다이렉트 방지 시 로그 추가
        if (url.includes("/api/v1/auth/login")) {
          console.info(
            `[fetchApi DEBUG] 401 on login page ${url}. Redirect to /login prevented as it is the login page or redirect is explicitly prevented.`
          );
        } else {
          // preventRedirectOn401 is true and not login page
          console.info(
            `[fetchApi DEBUG] Redirect to /login prevented for ${url} because preventRedirectOn401 is true.`
          );
        }
      }
    }

    // myInfos API가 아니고, 로그아웃 요청도 아닌 다른 API 요청에서 200 응답을 받았을 때
    if (
      response.ok &&
      !url.includes("/api/v1/myInfos") &&
      !url.includes("/api/v1/auth/logout") && // 로그아웃 URL 제외 조건 추가
      !url.includes("/api/v1/auth/me") && // me API도 제외 조건 추가
      !url.includes("/api/v1/admin") // 관리자 API 경로도 제외 조건 추가
    ) {
      if (myInfosFetchCount < MAX_MYINFOS_FETCH_ATTEMPTS) {
        // 최대 시도 횟수 체크
        try {
          // 현재 경로가 관리자 페이지인지 확인
          const isAdminPath =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/admin");

          // 관리자 페이지에서는 myInfos 호출 건너뛰기
          if (isAdminPath) {
            console.info("[fetchApi] myInfos update skipped for admin page");
          } else {
            // 사용자 정보 갱신
            const userInfoResponse = await fetchApi(
              `/api/v1/myInfos`,
              {
                credentials: "include",
              },
              true
            );

            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              myInfosFetchCount = 0; // 성공 시 카운터 초기화
            } else {
              myInfosFetchCount++; // 실패 시 카운터 증가
              console.warn(
                `[fetchApi] Internal myInfos update failed (attempt ${myInfosFetchCount}/${MAX_MYINFOS_FETCH_ATTEMPTS}). Status: ${userInfoResponse.status}`
              );
            }
          }
        } catch (error) {
          myInfosFetchCount++; // 예외 발생 시 카운터 증가
          console.error(
            `[fetchApi] Internal myInfos update failed (attempt ${myInfosFetchCount}/${MAX_MYINFOS_FETCH_ATTEMPTS}):`,
            error
          );
        }
      } else {
        console.warn(
          `[fetchApi] Internal myInfos update skipped as it has failed ${MAX_MYINFOS_FETCH_ATTEMPTS} times.`
        );
      }
    }

    return response;
  } catch (error) {
    console.error(`[fetchApi] Error during fetch for ${url}:`, error); // Log fetch error
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("요청 시간이 초과되었습니다.");
      }
    }
    throw error;
  }
}

/**
 * JSON 응답을 기대하는 API 요청
 * @param url API 엔드포인트 URL
 * @param options fetch 옵션
 * @returns 파싱된 JSON 데이터
 */
export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
  preventRedirectOn401: boolean = false // preventRedirectOn401 파라미터 추가 (fetchApi에 전달하기 위함)
): Promise<T> {
  // fetchApi 호출 시 preventRedirectOn401 옵션 전달
  const response = await fetchApi(url, options, preventRedirectOn401);

  // 응답이 ok가 아니면 에러 발생
  if (!response.ok) {
    let errorBody = null;
    try {
      // 에러 응답 본문을 읽으려고 시도
      errorBody = await response.text(); // text()로 읽어서 JSON이 아니더라도 확인 가능
    } catch (e) {
      console.warn(
        `[fetchJson] Failed to read error response body for ${url}:`,
        e
      );
    }

    // 에러 상태에 따른 처리
    if (response.status === 400 || response.status === 403) {
      // 클라이언트 에러는 일반 로그로 처리 (상세 내용 포함)
      console.log(
        `[fetchJson] Client error ${response.status} for ${url}: ${response.statusText}. Body:`,
        errorBody
      );
    } else if (response.status >= 500) {
      // 서버 에러는 경고 로그로 처리
      console.warn(`서버 에러 발생 (${response.status}):`, response.statusText);
    } else {
      // 기타 에러는 info 레벨로 처리
      console.info(`API 요청 실패 (${response.status}):`, response.statusText);
    }
    // 에러 메시지에 응답 본문 포함
    throw new Error(
      `API 요청 실패: ${response.status} ${response.statusText}${
        errorBody ? ` - ${errorBody}` : ""
      }`
    );
  }

  // 응답 텍스트 체크
  const text = await response.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }

  // JSON 파싱 시도 - 개선된 예외 처리
  try {
    const parsedData = JSON.parse(text);
    return parsedData as T;
  } catch (parseError) {
    // 로그 개선: URL과 응답 텍스트의 일부를 포함시켜 디버깅 용이하게
    console.error(
      `[fetchJson] JSON 파싱 에러 (${url}):`,
      parseError,
      `\n응답 텍스트 일부: ${text.substring(0, 200)}${
        text.length > 200 ? "..." : ""
      }`
    );

    // 더 자세한 에러 메시지
    throw new Error(
      `JSON 파싱 에러: ${(parseError as Error).message}. API: ${url}`
    );
  }
}

/**
 * GET 요청용 래퍼 함수
 */
export const get = async <T>(
  url: string,
  options?: RequestInit,
  preventRedirectOn401: boolean = false
): Promise<T> => {
  // fetchJson 호출 시 preventRedirect 전달
  return fetchJson<T>(url, { ...options, method: "GET" }, preventRedirectOn401);
};

/**
 * POST 요청용 래퍼 함수
 */
export const post = async <T>(
  url: string,
  data?: unknown,
  options?: RequestInit,
  preventRedirectOn401: boolean = false
): Promise<T> => {
  // fetchJson 호출 시 preventRedirect 전달
  return fetchJson<T>(
    url,
    {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: JSON.stringify(data),
    },
    preventRedirectOn401
  );
};

/**
 * PUT 요청용 래퍼 함수
 */
export const put = async <T>(
  url: string,
  data?: unknown,
  options?: RequestInit,
  preventRedirectOn401: boolean = false
): Promise<T> => {
  // fetchJson 호출 시 preventRedirect 전달
  return fetchJson<T>(
    url,
    {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: JSON.stringify(data),
    },
    preventRedirectOn401
  );
};

/**
 * PATCH 요청용 래퍼 함수
 */
export async function patch<T>(
  url: string,
  data: unknown,
  options?: RequestInit,
  preventRedirectOn401: boolean = false
): Promise<T> {
  return fetchJson<T>(
    url,
    {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: JSON.stringify(data),
    },
    preventRedirectOn401
  );
}

/**
 * DELETE 요청용 래퍼 함수
 */
export const del = async <T>(
  url: string,
  options?: RequestInit,
  preventRedirectOn401: boolean = false
): Promise<T> => {
  // fetchJson 호출 시 preventRedirect 전달
  return fetchJson<T>(
    url,
    { ...options, method: "DELETE" },
    preventRedirectOn401
  );
};

//import { ImageUploadResponse } from '../types/image'

// export const uploadImage = async (file: File): Promise<ImageUploadResponse> => {
//   const formData = new FormData();
//   formData.append("file", file);

//   const response = await fetchApi("/api/v1/images/upload", {
//     method: "POST",
//     body: formData,
//   });

//   if (!response.ok) {
//     let errorMsg = "이미지 업로드에 실패했습니다.";
//     try {
//       const errorData = await response.json();
//       errorMsg = errorData.message || `서버 응답 오류: ${response.status}`;
//     } catch {
//       errorMsg = response.statusText || `서버 오류: ${response.status}`;
//     }
//     throw new Error(errorMsg);
//   }

//   return response.json();
// };

/**
 * 일반 사용자 인증 상태 확인
 * @returns 사용자 정보
 */
export async function checkUserAuth<T = any>(): Promise<T> {
  return await get<T>("/api/v1/auth/me", {}, true);
}

/**
 * 관리자 인증 상태 확인
 * @returns 관리자 정보
 */
export async function checkAdminAuth<T = any>(): Promise<T> {
  return await get<T>("/api/v1/admin/me", {}, true);
}

/**
 * 현재 경로에 따라 적절한 인증 API 호출
 * @param isAdminPath 관리자 경로 여부
 * @returns 사용자 또는 관리자 정보
 */
export async function checkAuth<T = any>(isAdminPath: boolean): Promise<T> {
  if (isAdminPath) {
    return await checkAdminAuth<T>();
  } else {
    return await checkUserAuth<T>();
  }
}

/**
 * [사용자] 채팅방 목록 조회
 */
export async function getUserChatrooms<T = any[]>(): Promise<T> {
  try {
    // 사용자 본인의 채팅방 목록만 조회하는 API 사용
    console.log("[getUserChatrooms] 사용자 채팅방 목록 API 조회 시도");
    const userChatroomsResponse = await get<any>("/api/v1/chats/my", {}, true);

    // ApiResponse 형태로 응답이 왔는지 확인
    if (userChatroomsResponse && userChatroomsResponse.data) {
      console.log(
        "[getUserChatrooms] 사용자 채팅방 목록:",
        userChatroomsResponse.data
      );
      return userChatroomsResponse.data as T;
    }

    // 응답 자체가 배열인 경우
    if (Array.isArray(userChatroomsResponse)) {
      console.log(
        "[getUserChatrooms] 사용자 채팅방 배열 응답:",
        userChatroomsResponse
      );
      return userChatroomsResponse as T;
    }

    return [] as unknown as T;
  } catch (error) {
    console.error("[getUserChatrooms] 채팅방 목록 조회 중 오류:", error);
    return [] as unknown as T;
  }
}

/**
 * [사용자] 채팅방 메시지 조회
 * @param chatroomId 채팅방 ID
 */
export async function getUserChatMessages<T = any>(
  chatroomId: number
): Promise<T> {
  const response = await get<any>(
    `/api/v1/chats/${chatroomId}/messages`,
    {},
    true
  );
  // API 응답에서 data 속성 반환
  return response.data;
}

/**
 * [사용자] 채팅방 정보 조회
 * @param chatroomId 채팅방 ID
 */
export async function getUserChatroom<T = any>(chatroomId: number): Promise<T> {
  return await get<T>(`/api/v1/chats/${chatroomId}`, {}, true);
}

/**
 * [사용자] 관리자와 채팅 시작
 * @param title 채팅방 제목
 */
export async function startChatWithAdmin<T = any>(title: string): Promise<T> {
  return await post<T>("/api/v1/chats", { title }, {}, true);
}

/**
 * [사용자] 채팅방 참여
 * @param chatroomId 참여할 채팅방 ID
 * @param currentChatroomId 현재 참여 중인 채팅방 ID
 */
export async function joinUserChatroom<T = any>(
  chatroomId: number,
  currentChatroomId?: number
): Promise<T> {
  return await post<T>(
    `/api/v1/chats/${chatroomId}/users`,
    { currentChatroomId },
    {},
    true
  );
}

/**
 * [사용자] 채팅방 나가기
 * @param chatroomId 나갈 채팅방 ID
 */
export async function leaveUserChatroom<T = any>(
  chatroomId: number
): Promise<T> {
  return await del<T>(`/api/v1/chats/${chatroomId}/users`, {}, true);
}

/**
 * [관리자] 채팅방 목록 조회
 */
export async function getAdminChatrooms<T = any>(): Promise<T> {
  try {
    const response = await get<any>("/api/v1/admin/chats", {}, true);

    // ApiResponse 형태로 응답이 왔는지 확인
    if (response && typeof response === "object" && "data" in response) {
      return response.data as T;
    }

    // 응답 자체가 배열인 경우
    if (Array.isArray(response)) {
      return response as T;
    }

    console.error("잘못된 응답 형식:", response);
    return [] as unknown as T;
  } catch (error) {
    console.error("관리자 채팅방 목록 조회 중 오류:", error);
    return [] as unknown as T;
  }
}

/**
 * [관리자] 채팅방 메시지 조회
 * @param chatroomId 채팅방 ID
 */
export async function getAdminChatMessages<T = any>(
  chatroomId: number
): Promise<T> {
  try {
    // 관리자용 API 경로 사용
    const response = await get<any>(
      `/api/v1/admin/chats/${chatroomId}/messages`,
      {},
      true
    );

    // ApiResponse 형태로 응답이 왔는지 확인
    if (response && typeof response === "object" && "data" in response) {
      return response.data as T;
    }

    return response as T;
  } catch (error) {
    console.error("관리자 채팅방 메시지 조회 중 오류:", error);
    // 관리자용 API가 실패할 경우 일반 API로 폴백
    console.log("일반 채팅방 메시지 API로 폴백 시도");
    return await get<T>(`/api/v1/chats/${chatroomId}/messages`, {}, true);
  }
}

/**
 * [관리자] 채팅방 정보 조회
 * @param chatroomId 채팅방 ID
 */
export async function getAdminChatroom<T = any>(
  chatroomId: number
): Promise<T> {
  try {
    const response = await get<any>(
      `/api/v1/admin/chats/${chatroomId}`,
      {},
      true
    );

    // ApiResponse 형태로 응답이 왔는지 확인
    if (response && typeof response === "object" && "data" in response) {
      return response.data as T;
    }

    return response as T;
  } catch (error) {
    console.error("관리자 채팅방 상세 조회 중 오류:", error);
    // 관리자용 API가 실패할 경우 일반 API로 폴백
    console.log("일반 채팅방 API로 폴백 시도");
    return await get<T>(`/api/v1/chats/${chatroomId}`, {}, true);
  }
}

/**
 * [관리자] 채팅방 생성
 * @param title 채팅방 제목
 */
export async function createAdminChatroom<T = any>(title: string): Promise<T> {
  // title을 요청 본문 대신 쿼리 파라미터로 전송
  return await post<T>(
    `/api/v1/chats?title=${encodeURIComponent(title)}`,
    {},
    {},
    true
  );
}

/**
 * [관리자] 채팅방 참여
 * @param chatroomId 참여할 채팅방 ID
 * @param currentChatroomId 현재 참여 중인 채팅방 ID
 */
export async function joinAdminChatroom<T = any>(
  chatroomId: number,
  currentChatroomId?: number
): Promise<T> {
  return await post<T>(
    `/api/v1/chats/${chatroomId}/users`,
    { currentChatroomId },
    {},
    true
  );
}

/**
 * [관리자] 채팅방 나가기
 * @param chatroomId 나갈 채팅방 ID
 */
export async function leaveAdminChatroom<T = any>(
  chatroomId: number
): Promise<T> {
  return await del<T>(`/api/v1/chats/${chatroomId}/users`, {}, true);
}

/**
 * [authApi] 채팅방 목록 조회
 */
export async function getChatrooms<T = any>(): Promise<T> {
  return await get<T>("/api/v1/chats", {}, true);
}

/**
 * [authApi] 채팅방 메시지 조회
 * @param chatroomId 채팅방 ID
 */
export async function getChatMessages<T = any>(chatroomId: number): Promise<T> {
  return await get<T>(`/api/v1/chats/${chatroomId}/messages`, {}, true);
}

/**
 * [authApi] 채팅방 정보 조회
 * @param chatroomId 채팅방 ID
 */
export async function getChatroom<T = any>(chatroomId: number): Promise<T> {
  return await get<T>(`/api/v1/chats/${chatroomId}`, {}, true);
}

/**
 * [authApi] 채팅방 생성
 * @param title 채팅방 제목
 */
export async function createChatroom<T = any>(title: string): Promise<T> {
  // title을 요청 본문 대신 쿼리 파라미터로 전송
  return await post<T>(
    `/api/v1/chats?title=${encodeURIComponent(title)}`,
    {},
    {},
    true
  );
}

/**
 * [authApi] 채팅방 참여
 * @param chatroomId 참여할 채팅방 ID
 * @param currentChatroomId 현재 참여 중인 채팅방 ID
 */
export async function joinChatroom<T = any>(
  chatroomId: number,
  currentChatroomId?: number
): Promise<T> {
  return await post<T>(
    `/api/v1/chats/${chatroomId}/users`,
    { currentChatroomId },
    {},
    true
  );
}

/**
 * [authApi] 채팅방 나가기
 * @param chatroomId 나갈 채팅방 ID
 */
export async function leaveChatroom<T = any>(chatroomId: number): Promise<T> {
  return await del<T>(`/api/v1/chats/${chatroomId}/users`, {}, true);
}

export async function uploadProfileImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("multipartFile", file);
  const response = await fetchApi("/api/v1/profile-images/upload", {
    method: "POST",
    body: formData,
    // fetchApi가 FormData면 Content-Type 자동 처리
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(msg || "업로드 실패");
  }
  return response.text();
}

/**
 * [사용자] 채팅방 종료하기 (상태를 INACTIVE로 변경)
 * @param chatroomId 종료할 채팅방 ID
 */
export async function closeChatroom<T = any>(chatroomId: number): Promise<T> {
  // 채팅방 종료 전용 엔드포인트가 없어서 채팅방 나가기 API를 사용
  // 백엔드 로직에서 leaveChatroom 함수가 채팅방 상태를 INACTIVE로 변경함
  return await del<T>(`/api/v1/chats/${chatroomId}/users`, {}, true);
}

/**
 * [사용자] 사용자의 활성화된 채팅방 조회
 * 상태가 ACTIVE인 채팅방만 필터링하여 반환
 */
export async function getActiveUserChatrooms<T = any[]>(): Promise<T> {
  try {
    console.log("[getActiveUserChatrooms] 활성화된 채팅방 목록 조회 시도");
    const allChatrooms = await getUserChatrooms(); // 이미 사용자 본인의 채팅방만 조회

    // 상태가 ACTIVE인 채팅방만 필터링
    const activeChatrooms = Array.isArray(allChatrooms)
      ? allChatrooms.filter((room: any) => room.status === "ACTIVE")
      : [];

    console.log(
      `[getActiveUserChatrooms] 활성화된 채팅방 ${activeChatrooms.length}개 조회됨`
    );
    return activeChatrooms as unknown as T;
  } catch (error) {
    console.error(
      "[getActiveUserChatrooms] 활성화된 채팅방 목록 조회 중 오류:",
      error
    );
    return [] as unknown as T;
  }
}

export async function markMessagesAsRead<T = any>(
  chatroomId: number
): Promise<T> {
  return await post<T>(`/api/v1/chats/${chatroomId}/read`);
}
