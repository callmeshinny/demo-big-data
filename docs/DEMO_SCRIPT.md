# TV4 demo talk track

## Three-minute walkthrough

### Dataset

**English.** Our task is next-item prediction from a shopping session's views, carts and purchases. We use the public 2019-Oct e-commerce dataset and the team's weekly cuDF workflow. Experiments use nested session-level subsets from the first seven days, not randomly sampled individual events. This keeps each session's interaction sequence together for evaluation.

*Tiếng Việt. Bài toán là dự đoán sản phẩm tiếp theo trong phiên mua sắm dựa trên sản phẩm đã xem, thêm vào giỏ hoặc mua. Nhóm dùng bộ dữ liệu sự kiện thương mại điện tử công khai tháng 10/2019 và workflow cuDF theo tuần. Đầu vào thí nghiệm dùng các tập con lồng nhau ở mức phiên trong bảy ngày đầu, không lấy mẫu ngẫu nhiên từng sự kiện.*

**English.** The Dataset tab traces raw population, cleaning, eligible sequences, vocabulary and train, validation and test counts to the TV2 package. It reports subset sizes, event and sequence distribution differences, and known limits. These are checks on this sample, not proof it represents all shoppers or seasons.

*Tiếng Việt. Tab Dataset truy xuất quy mô dữ liệu thô, bước làm sạch, chuỗi hợp lệ, vocabulary và số lượng train, validation, test theo package TV2. Tab cũng cho biết mỗi tập con chiếm bao nhiêu và phân phối sự kiện, chuỗi khác tập đầy đủ ra sao. Đây là mô tả mẫu dữ liệu, không chứng minh mẫu đại diện cho mọi người mua hay mọi mùa.*

### Recommendations

**English.** The Recommendation tab replays official E1 test predictions for Popularity, GRU and XLNet. It shows 30 of 1,337 sessions, selected across all models by the seed-1 SHA-256 rule on session ID. Selection is independent of hit or miss. Choose a session to see its history, actual next product and model-ordered Top-20.

*Tiếng Việt. Tab Recommendation phát lại dự đoán test E1 chính thức của Popularity, GRU và XLNet. Tab hiển thị 30 trong 1.337 phiên, chọn theo cùng quy tắc SHA-256 với seed 1 cho cả ba mô hình. Quy tắc băm mã phiên nên việc chọn không phụ thuộc mô hình có dự đoán trúng hay không. Chọn phiên để xem lịch sử tương tác, sản phẩm tiếp theo thực tế và Top-20 theo thứ tự mô hình.*

**English.** A hit means the actual product ID appears in Top-20; otherwise it is a miss. Recall@20 and NDCG@20 beside the selector are official full-test E1 metrics, not recomputed from these 30 sessions. Models export ranked IDs only, so there is no Score column and cards show original IDs. This is saved-output replay, not live inference or retraining.

*Tiếng Việt. Target được tô sáng là dự đoán trúng nếu mã sản phẩm gốc xuất hiện trong danh sách; nếu không, đó là phiên trượt. Recall@20 và NDCG@20 cạnh bộ chọn mô hình là metric chính thức trên toàn bộ test E1, không phải điểm tính lại trên 30 phiên đang hiển thị. Model chỉ xuất mã sản phẩm theo thứ hạng, nên không có cột Điểm và thẻ hiển thị mã sản phẩm gốc. Đây là phát lại output đã lưu, không phải suy luận trực tiếp hay chạy huấn luyện mới.*

### Experiments

**English.** E1 compares the three models under the delivered test protocol. XLNet leads Recall@20 at 0.1249 in this single run. Treat this as a descriptive result from one seed, not evidence of repeat-run stability. Metrics come from the official package; the recommendation sample is for inspecting examples.

*Tiếng Việt. E1 so sánh ba mô hình theo protocol test đã bàn giao. Trong lần chạy đơn lẻ này, XLNet có Recall@20 cao nhất: 0.1249. Đây là kết quả của một lần chạy và một seed, không phải bằng chứng về độ ổn định qua nhiều lần chạy. Metric lấy từ package chính thức; mẫu recommendation dùng để xem từng ví dụ.*

**English.** E3 compares train batches 32 and 128 on validation, holding other conditions fixed. Batch 32 gives Recall@20 0.1964 and process wall 65.94 seconds; batch 128 gives 0.1299 and 44.77 seconds. This validation tradeoff is not directly comparable with E1 or E2 test accuracy.

*Tiếng Việt. E3 so sánh batch huấn luyện 32 và 128 trên validation, giữ các điều kiện khác cố định. Batch 32 có Recall@20 là 0.1964 và thời gian tiến trình 65.94 giây; batch 128 lần lượt là 0.1299 và 44.77 giây. Đây là sự đánh đổi trên validation, không nên so sánh trực tiếp độ chính xác với test E1 hoặc E2.*

**English.** E4 reports CSV at 127.8 MiB and Parquet at 24.2 MiB. Reads take 0.454 and 0.109 seconds; preprocessing including read takes 34.99 and 33.57 seconds. The package measured a warm cache, so these results describe that run, not every storage setup.

*Tiếng Việt. E4 ghi nhận CSV có dung lượng 127.8 MiB và Parquet 24.2 MiB. Thời gian đọc lần lượt là 0.454 giây với CSV và 0.109 giây với Parquet. Thời gian preprocessing wall, vốn đã bao gồm đọc dữ liệu, lần lượt là 34.99 và 33.57 giây. Package đo trong điều kiện cache ấm, nên đây là số liệu của lần chạy đó, không đại diện cho mọi hệ thống lưu trữ.*

**English.** E5 reuses verified E2 runs across four subset sizes. Normalized time is 66.7, 56.9, 55.8 and 55.6 seconds per million events. Composed time excludes shared first-seen and is not observed end-to-end wall time. These measured curves do not guarantee throughput.

*Tiếng Việt. E5 dùng lại các lượt E2 đã xác minh để trình bày thời gian tổng hợp và số giây trên một triệu sự kiện ở bốn kích thước tập con. Các giá trị chuẩn hóa là 66.7, 56.9, 55.8 và 55.6 giây trên một triệu sự kiện. Thời gian tổng hợp không gồm first-seen dùng chung và không phải thời gian đầu-cuối quan sát trực tiếp. Đường biểu diễn mô tả pipeline đã đo, không phải cam kết throughput.*

## Likely questions

1. **Why only one run and seed?** The official package contains one run for each reported configuration. It supports a descriptive comparison, but cannot estimate run-to-run variation (`limits`).

   *Vì sao chỉ có một lần chạy và một seed? Package chính thức có một lần chạy cho mỗi cấu hình. Kết quả hỗ trợ so sánh mô tả nhưng không ước lượng được biến động giữa các lần chạy (`limits`).*

2. **Why is E3 on validation?** E3 measures the batch-size comparison on validation; its protocol says these values are not directly comparable with E1/E2 test (`dictionary.E3_accuracy`).

   *Vì sao E3 dùng validation? E3 đo so sánh batch size trên validation; protocol nói không so sánh trực tiếp các giá trị này với test E1/E2 (`dictionary.E3_accuracy`).*

3. **Why are prediction scores and product names missing?** The delivered rows contain ranked product IDs, not per-item scores or TV1 metadata. The UI does not infer a score from rank or invent names.

   *Vì sao thiếu điểm dự đoán và tên sản phẩm? Các dòng được bàn giao có mã sản phẩm theo thứ hạng, không có điểm từng sản phẩm hay metadata từ TV1. UI không suy ra điểm từ thứ hạng hoặc tự đặt tên.*

4. **What does Recall@20 mean?** For each evaluated session, it is one if the actual next item appears in the Top-20 and zero otherwise, averaged over sessions. See [docs/modeling/model_protocol.md](../../Big-Data/docs/modeling/model_protocol.md), “Evaluation chung cho ba model.”

   *Recall@20 nghĩa là gì? Với mỗi phiên được đánh giá, giá trị là một nếu sản phẩm tiếp theo thực tế nằm trong Top-20, ngược lại là không; sau đó lấy trung bình trên các phiên. Xem [docs/modeling/model_protocol.md](../../Big-Data/docs/modeling/model_protocol.md), mục “Evaluation chung cho ba model.”*

5. **Why does E4 preprocessing time not add read time?** The preprocessing wall field already includes its own read, so adding the separate read measurement would count it twice (`dictionary.E4_preprocessing_wall`).

   *Vì sao thời gian preprocessing E4 không cộng thêm thời gian đọc? Trường preprocessing wall đã gồm thời gian đọc của nó; cộng số đo đọc riêng sẽ tính trùng (`dictionary.E4_preprocessing_wall`).*

6. **Is E5 an end-to-end wall time?** No. It is composed from measured stages, excludes shared first-seen and is explicitly not observed end-to-end wall time (`dictionary.E5_composed`).

   *E5 có phải thời gian đầu-cuối thực đo không? Không. Nó tổng hợp từ các giai đoạn đã đo, không gồm first-seen dùng chung và được ghi rõ là không phải thời gian đầu-cuối quan sát trực tiếp (`dictionary.E5_composed`).*

7. **How is a session’s prediction evaluated?** The stored row gives the prefix, its actual next-item target and the model’s ordered Top-20. A hit means that target ID occurs in those recommendations; no score is required.

   *Đánh giá dự đoán của một phiên như thế nào? Dòng đã lưu có prefix, target sản phẩm tiếp theo thực tế và Top-20 theo thứ tự của mô hình. Dự đoán trúng nghĩa là ID target có trong danh sách; không cần điểm số.*

8. **Does the demo run live inference, and how can it be rebuilt?** No. It replays the checksum-verified E1 predictions; it does not load a model or retrain. Use the real-E1 export and build commands in [README.md](../README.md).

   *Demo có chạy suy luận trực tiếp và làm lại thế nào? Không. Demo phát lại dự đoán E1 đã xác minh checksum, không nạp model hay huấn luyện lại. Dùng lệnh xuất real-E1 và build trong [README.md](../README.md).*

9. **How is the 30-session sample selected?** Sort sessions by SHA-256 of `1:<user_session>` and take the first 30. The same deterministic membership is used for all three models, independent of hit or miss.

   *Mẫu 30 phiên được chọn thế nào? Sắp xếp phiên theo SHA-256 của `1:<user_session>` rồi lấy 30 phiên đầu. Cả ba mô hình dùng cùng membership xác định, không phụ thuộc trúng hay trượt.*

10. **Are these toy or real recommendations?** They are the `data_kind: real` E1 runs `e1-popularity-010`, `e1-gru-010` and `e1-xlnet-010`, checked against the delivered prediction bundle and catalog. Toy fixtures are separate test inputs.

    *Đây là gợi ý toy hay thật? Đây là các lượt E1 `data_kind: real` `e1-popularity-010`, `e1-gru-010` và `e1-xlnet-010`, đã đối chiếu với prediction bundle và catalog được bàn giao. Fixture toy là đầu vào test riêng.*

11. **Why might the sample be browsing-heavy?** The source is a short time window and the subset retains whole sessions. The Dataset tab reports event and sequence distribution differences and the known limits; results should not be generalized to all customers.

    *Vì sao mẫu có thể thiên về hành vi xem? Nguồn là một khoảng thời gian ngắn và tập con giữ nguyên toàn bộ phiên. Tab Dataset báo cáo khác biệt phân phối sự kiện, chuỗi và các giới hạn đã biết; không nên khái quát kết quả cho mọi khách hàng.*

12. **What does the Recommendation tab show?** Real E1 predictions for 30 of 1,337 sessions, selected by the seed-1 hash rule, with history, actual next product and Top-20. It shows no per-item scores or product names.

    *Tab Recommendation hiển thị gì? Dự đoán E1 thật cho 30 trong 1.337 phiên, chọn theo quy tắc hash seed 1, cùng lịch sử, sản phẩm tiếp theo thực tế và Top-20. Tab không hiển thị điểm từng sản phẩm hay tên sản phẩm.*

## Sources

Values are copied from package `tv2-20261124`, chiefly `E1.csv`, `E3.csv`, `E4.csv`, and `E5.csv`. Limitations are from `manifest.json → limits` and `data_dictionary.json`.
