# TV4 demo talk track

## Three-minute walkthrough

### Dataset

**English.** The task is to predict the next product from a session’s interaction history. The official experiment data uses the weekly cuDF workflow and nested first-week subsets. The Dataset tab shows the population, cleaning and split counts from the TV2 supplementary tables.

*Tiếng Việt. Bài toán là dự đoán sản phẩm tiếp theo từ lịch sử tương tác trong phiên. Dữ liệu thí nghiệm chính thức dùng workflow cuDF theo tuần và các tập con lồng nhau trong tuần đầu. Tab Dữ liệu hiển thị quy mô, số liệu làm sạch và phân chia từ các bảng bổ sung của TV2.*

### Recommendations

**English.** The real prediction bundle is still pending, so this tab keeps a clearly labelled toy format example. The official metric package does not contain per-session scores, so the demo does not show a score.

*Tiếng Việt. Bộ dự đoán thật vẫn đang chờ, vì vậy tab này giữ ví dụ định dạng toy có nhãn rõ ràng. Gói metric chính thức không có điểm số theo từng phiên nên demo không hiển thị điểm.*

### Experiments

**English.** In E1, XLNet has the highest Recall@20 among the three models. The package reports 0.12490650710545999 for `e1-xlnet-010` in `E1.csv`, but this is a single run and seed, so it is not a repeated-run estimate.

*Tiếng Việt. Trong E1, XLNet có Recall@20 cao nhất trong ba mô hình. Gói dữ liệu ghi nhận 0.12490650710545999 cho `e1-xlnet-010` trong `E1.csv`, nhưng đây là một lần chạy và một seed, không phải ước lượng từ nhiều lần chạy.*

**English.** E3 shows a tradeoff on validation: train batch 32 has Recall@20 of 0.19637462235649547 and process wall time of 65.94311637600003 seconds; batch 128 has 0.1299093655589124 and 44.7698482299993 seconds. These validation values should not be compared directly with E1 or E2 test results (`E3.csv`; `dictionary.E3_accuracy`).

*Tiếng Việt. E3 cho thấy sự đánh đổi trên tập validation: batch train 32 có Recall@20 là 0.19637462235649547 và thời gian process wall là 65.94311637600003 giây; batch 128 lần lượt là 0.1299093655589124 và 44.7698482299993 giây. Không nên so sánh trực tiếp các giá trị validation này với kết quả test của E1 hoặc E2 (`E3.csv`; `dictionary.E3_accuracy`).*

**English.** In E4, the Parquet file is 25,382,745 bytes versus 134,004,153 bytes for CSV. Its read took 0.1085011539998959 seconds versus 0.45413743600011003 seconds. Preprocessing including read took 33.57124894300023 seconds for Parquet and 34.987556843999755 seconds for CSV, which is similar. The package notes that the cache was warm and preprocessing already includes reading (`E4.csv`; `limits`; `dictionary.E4_preprocessing_wall`).

*Tiếng Việt. Trong E4, tệp Parquet có kích thước 25,382,745 byte so với CSV là 134,004,153 byte. Thời gian đọc lần lượt là 0.1085011539998959 giây và 0.45413743600011003 giây. Tiền xử lý bao gồm đọc mất 33.57124894300023 giây với Parquet và 34.987556843999755 giây với CSV, gần tương đương. Gói dữ liệu lưu ý cache đã ấm và thời gian tiền xử lý đã bao gồm đọc (`E4.csv`; `limits`; `dictionary.E4_preprocessing_wall`).*

**English.** E5 reports composed time excluding shared first-seen and seconds per million events. Across the 10%, 25%, 50% and 100% subsets, the package reports 66.73532777002474, 56.90217720991631, 55.83125010467014 and 55.637233748284764 seconds per million events. This composed time is not observed end-to-end wall time (`E5.csv`; `dictionary.E5_composed`).

*Tiếng Việt. E5 báo cáo thời gian tổng hợp không gồm chi phí first-seen dùng chung và số giây trên một triệu sự kiện. Với các tập con 10%, 25%, 50% và 100%, gói dữ liệu lần lượt ghi nhận 66.73532777002474, 56.90217720991631, 55.83125010467014 và 55.637233748284764 giây trên một triệu sự kiện. Thời gian tổng hợp này không phải thời gian thực đo từ đầu đến cuối (`E5.csv`; `dictionary.E5_composed`).*

## Likely questions

1. **Why only one run and seed?** The official package contains one run per reported configuration. It supports a descriptive comparison, but it cannot show run-to-run variation (`limits`).

   *Vì sao chỉ có một lần chạy và một seed? Gói chính thức có một lần chạy cho mỗi cấu hình. Kết quả hỗ trợ so sánh mô tả nhưng không cho biết biến động giữa các lần chạy (`limits`).*

2. **Why is E3 on validation?** E3 measures the batch-size comparison on validation; its protocol says these values are not directly comparable with E1/E2 test (`dictionary.E3_accuracy`).

   *Vì sao E3 dùng validation? E3 đo so sánh batch size trên validation; quy ước của gói cho biết không so sánh trực tiếp các giá trị này với test của E1/E2 (`dictionary.E3_accuracy`).*

3. **Why are scores not shown?** The exported prediction rows contain ranked product IDs, not per-item scores. No score is inferred from rank.

   *Vì sao không hiển thị điểm? Các dòng dự đoán xuất ra chứa mã sản phẩm theo thứ hạng, không có điểm theo từng sản phẩm. Demo không suy ra điểm từ thứ hạng.*

4. **What does Recall@20 mean?** It records whether the single actual next item appears in the model’s Top-20 list, averaged over evaluated sessions (`dictionary.inference_protocol`).

   *Recall@20 nghĩa là gì? Chỉ số ghi nhận sản phẩm tiếp theo thực tế có nằm trong Top-20 của mô hình hay không, lấy trung bình trên các phiên được đánh giá (`dictionary.inference_protocol`).*

5. **Why does E4 preprocessing time not add read time?** The preprocessing wall field already includes its own read, so adding the separate read measurement would count it twice (`dictionary.E4_preprocessing_wall`).

   *Vì sao thời gian tiền xử lý E4 không cộng thêm thời gian đọc? Trường preprocessing wall đã bao gồm thời gian đọc của chính nó; cộng số đo đọc riêng sẽ tính trùng (`dictionary.E4_preprocessing_wall`).*

6. **Is E5 an end-to-end wall time?** No. It is a composed metric that excludes shared first-seen and is explicitly not observed end-to-end wall time (`dictionary.E5_composed`).

   *E5 có phải thời gian thực đo từ đầu đến cuối không? Không. Đây là metric tổng hợp không gồm first-seen dùng chung và được ghi rõ là không phải thời gian thực đo từ đầu đến cuối (`dictionary.E5_composed`).*

## Sources

Values are copied from package `tv2-20261124`, chiefly `E1.csv`, `E3.csv`, `E4.csv`, and `E5.csv`. Limitations are from `manifest.json → limits` and `data_dictionary.json`.
