# TV4 demo talk track

## Presenter notes (not spoken)

- **Presenter mode.** Turn on **Presenter mode** in the header, or open the site with `?present=1` (for example `https://demo-big-data.onrender.com/?present=1`). Text grows to 18 px, chart labels to 16 px, glass is turned off and measurement notes start collapsed. The choice is remembered on this browser; turn it off with the same switch or `?present=0`.
- **Session to show.** The control bar shows “Try session X: hit for all 3 models”. X is computed from `public/demo-data.json` as the first session, in sample order, that every model ranks in its Top-20. With the current data it is **21546** (Popularity rank 7, GRU rank 13, XLNet rank 5). Click the tip to load it; the History, Actual next item and the Hit/Miss sentence fit above the fold at 1280×800. Session 46465 (the default, first in sample order) is a miss for all three models.
- **Clicking charts during the talk.** In every E panel, hover or tap a bar/point to see its tooltip (value, raw value, unit, run ID, source file). Click to select it: the other marks dim and the matching table column is highlighted. Click again or press **Esc** to clear. Arrow keys move between marks. In E5, selecting a level shows “Open the N% run in E2 →”. In E2, the same level arrives preselected.
- **Numbers.** Every number on screen comes from `public/*.json`. Read the rounded values shown on screen: Recall/NDCG to 4 decimals, times to 3 significant digits, sizes in MiB. The exact value is in each tooltip. The values below match the screen.

## Three-minute walkthrough

### Dataset

**English.** Our task is next-item prediction from a shopping session's views, carts and purchases. We use the public 2019-Oct e-commerce dataset and the team's weekly cuDF workflow. Experiments use nested session-level subsets from the first seven days, not randomly sampled individual events. This keeps each session's interaction sequence together for evaluation.

*Tiếng Việt. Bài toán là dự đoán sản phẩm tiếp theo trong phiên mua sắm dựa trên sản phẩm đã xem, thêm vào giỏ hoặc mua. Nhóm dùng bộ dữ liệu sự kiện thương mại điện tử công khai tháng 10/2019 và workflow cuDF theo tuần. Đầu vào thí nghiệm dùng các tập con lồng nhau ở mức phiên trong bảy ngày đầu, không lấy mẫu ngẫu nhiên từng sự kiện.*

**English.** The Dataset tab traces cleaning and split counts to the TV2 package. After cleanup the task is mostly next-product browsing, and results cover only sessions with at least two interactions.

*Tiếng Việt. Tab Dataset truy xuất số liệu làm sạch và chia tập theo package TV2. Sau khi làm sạch, bài toán chủ yếu là dự đoán sản phẩm xem tiếp theo, và kết quả chỉ áp dụng cho session có ít nhất hai tương tác.*

### Recommendations

**English.** The Recommendation tab replays official E1 test predictions for Popularity, GRU and XLNet. It shows 30 of 1,337 sessions, selected by the seed-1 SHA-256 rule on session ID, independent of hit or miss. Choose a model and session to see the history, the actual next product and the model-ordered Top-20.

*Tiếng Việt. Tab Recommendation phát lại dự đoán test E1 chính thức của Popularity, GRU và XLNet. Tab hiển thị 30 trong 1.337 phiên, chọn theo cùng quy tắc SHA-256 với seed 1 cho cả ba mô hình. Quy tắc băm mã phiên nên việc chọn không phụ thuộc mô hình có dự đoán trúng hay không. Chọn phiên để xem lịch sử tương tác, sản phẩm tiếp theo thực tế và Top-20 theo thứ tự mô hình.*

**English.** A hit means the actual product appears in the Top-20. The E1 strip below shows official full-test metrics, not values from these 30 sessions. Models export ranked IDs only, so there is no score; this is saved-output replay.

*Tiếng Việt. Dự đoán trúng nghĩa là sản phẩm thực tế nằm trong Top-20. Dải E1 bên dưới là metric chính thức trên toàn bộ tập test, không phải giá trị từ 30 phiên này. Model chỉ xuất mã sản phẩm theo thứ hạng nên không có điểm; đây là phát lại output đã lưu.*

### Experiments

**English.** E1 is the only fair model comparison. XLNet is the most accurate, with Recall@20 at 0.1249, and Popularity is the cheapest to train and evaluate. GRU is only slightly above Popularity on this test. It is one run and one seed, so this holds for the runs we measured, not as a general ranking.

*Tiếng Việt. E1 là phép so sánh mô hình công bằng duy nhất. XLNet chính xác nhất, Recall@20 đạt 0.1249, còn Popularity có chi phí huấn luyện và đánh giá thấp nhất. GRU chỉ nhỉnh hơn Popularity một chút trên tập test này. Đây là một lần chạy, một seed, nên kết luận đúng cho các run đã đo, không phải xếp hạng tổng quát.*

**English.** E2 trains GRU on each nested subset. Recall@20 rises from 0.0883 at 10% to 0.3899 at 100%, but the test sessions and catalog also change, so this is not a pure training-size effect. We mainly use E2 to see how pipeline cost grows with data.

*Tiếng Việt. E2 huấn luyện GRU trên từng tập con lồng nhau. Recall@20 tăng từ 0.0883 ở 10% lên 0.3899 ở 100%, nhưng tập test và catalog cũng thay đổi, nên đây không chỉ là tác động của kích thước dữ liệu huấn luyện. Nhóm dùng E2 chủ yếu để xem chi phí pipeline tăng theo dữ liệu.*

**English.** For compute resources, we kept the same VM and GPU and changed the GRU training batch from 32 to 128. The larger batch trained faster but used more GPU memory and scored lower on validation: a trade-off, not a free improvement. We don't compare this validation result with E1.

*Tiếng Việt. Với tài nguyên tính toán, nhóm giữ nguyên VM và GPU, chỉ đổi batch huấn luyện GRU từ 32 lên 128. Batch lớn hơn huấn luyện nhanh hơn nhưng dùng nhiều bộ nhớ GPU hơn và điểm validation thấp hơn: một sự đánh đổi, không phải cải tiến miễn phí. Nhóm không so sánh kết quả validation này với E1.*

**English.** For storage, we saved the same events as CSV and Parquet, with matching data fingerprints. TV2's analysis finds Parquet about five times smaller and about four times faster to read, but total preprocessing barely changes, because reading is a small part of the pipeline.

*Tiếng Việt. Với lưu trữ, nhóm lưu cùng một tập sự kiện dưới dạng CSV và Parquet, dấu vân tay dữ liệu trùng khớp. Theo phân tích của TV2, Parquet nhỏ hơn khoảng năm lần và đọc nhanh hơn khoảng bốn lần, nhưng tổng thời gian tiền xử lý gần như không đổi, vì bước đọc chỉ là một phần nhỏ của pipeline.*

**English.** E5 reuses the verified E2 runs. The bottleneck moves from preprocessing at 10% to training at 100%, so faster reading alone will not fix it at scale. Time per million events is 66.7, 56.9, 55.8 and 55.6 seconds, consistent with fixed costs being spread over more data.

*Tiếng Việt. E5 dùng lại các lượt E2 đã xác minh. Nút thắt chuyển từ tiền xử lý ở 10% sang huấn luyện ở 100%, nên chỉ đọc nhanh hơn sẽ không giải quyết được ở quy mô lớn. Thời gian cho mỗi triệu sự kiện lần lượt là 66.7, 56.9, 55.8 và 55.6 giây, phù hợp với việc chi phí cố định được chia cho nhiều dữ liệu hơn.*

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

13. **Why didn't you vary CPU, RAM or workers?** We had one AWS VM with a single T4 GPU, so the hardware was fixed. Batch size was the resource setting we could control: it changes how much work the GPU does per step and how much GPU memory it uses. Varying CPU, RAM or workers would need more VM types, which we list as future work.

    *Vì sao không thay đổi CPU, RAM hay số worker? Nhóm có một VM AWS với một GPU T4, nên phần cứng cố định. Batch size là thiết lập tài nguyên nhóm điều khiển được: nó thay đổi lượng việc GPU làm mỗi bước và lượng bộ nhớ GPU dùng. Thay đổi CPU, RAM hay số worker cần thêm loại VM khác, nhóm ghi nhận là hướng phát triển.*

14. **Was E4 a fair comparison?** Yes. Both runs used the same 882,808 events, verified by a fingerprint, the same program, and all nine columns read as strings, so only the file format differs.

    *E4 có phải so sánh công bằng không? Có. Hai lượt chạy dùng cùng 882,808 sự kiện, đã xác minh bằng dấu vân tay dữ liệu, cùng chương trình, và đọc cả chín cột dạng chuỗi, nên chỉ khác nhau ở định dạng tệp.*

## Sources

Values are copied from package `tv2-20261124`, chiefly `E1.csv`, `E2.csv`, `E3.csv`, `E4.csv`, and `E5.csv`, and rounded as the UI shows them. Spoken ratios ("about five times smaller", "about four times faster") are TV2's, from `reports/tables/tv2-20261124/analysis.md` finding 6; the UI shows both values instead. Limitations are from `manifest.json → limits` and `data_dictionary.json`.
