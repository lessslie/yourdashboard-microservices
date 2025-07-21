import React, { useEffect, useState } from "react";
import { Layout, Button, List, Skeleton, Pagination } from "antd";
import { useAuth, useUserData } from "../Auth/hooks/useAuth";
import { getEmails } from "./lib/emails";

const { Content } = Layout;

interface IEmailBack {
  id: string;
  messageId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedDate: string;
  isRead: false;
  hasAttachments: false;
}

interface IDataEmail {
  emails: IEmail[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

interface IEmail {
  id: string;
  name: string;
  from: string;
  to?: string[];
  subject: string;
  body?: string;
  date: string;
  read?: boolean;
}

const ListEmails = () => {
  const { userData } = useUserData();
  const { token } = useAuth();

  const [initLoading, setInitLoading] = useState(true);

  const [list, setList] = useState<IDataEmail>({
    emails: [],
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10,
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  console.log("list.emails", list.emails);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setInitLoading(true);
        const emails = await getEmails(token, userData.id || "", page, limit);
        console.log("emails", userData.id);

        const dataEmails = emails.data;
        setList({
          emails: dataEmails.emails.map(
            (email: IEmailBack): IEmail => ({
              id: email.id,
              name: email.fromName,
              from: email.fromEmail,
              subject: email.subject,
              date: email.receivedDate,
              read: email.isRead,
            })
          ),
          hasNextPage: dataEmails.hasNextPage,
          hasPreviousPage: dataEmails.hasPreviousPage,
          limit: dataEmails.limit,
          page: dataEmails.page,
          total: dataEmails.total,
          totalPages: dataEmails.totalPages,
        });
      } catch (error) {
        console.log(error);
      } finally {
        setInitLoading(false);
      }
    };
    fetchEmails();
  }, [token, page, userData.id, limit]);

  return (
    <Content style={{ padding: "0 48px" }}>
      <div
        style={{
          minHeight: 280,
          padding: 24,
        }}
      >
        <List
          className="demo-loadmore-list"
          loading={initLoading}
          itemLayout="horizontal"
          //  loadMore={loadMore}
          dataSource={list.emails}
          renderItem={(item) => (
            <List.Item
            //   actions={[
            //     <a key="list-loadmore-edit">edit</a>,
            //     <a key="list-loadmore-more">more</a>,
            //   ]}
            >
              <Skeleton avatar title={false} loading={false} active>
                <List.Item.Meta
                  // avatar={<Avatar src={item.avatar} />}
                  title={item.name}
                  description={item.subject}
                />
                <Button type="primary">Ver mas</Button>
              </Skeleton>
            </List.Item>
          )}
        />
        {list.totalPages > 1 && (
          <Pagination
            total={list.total}
            showTotal={(total) => `Total ${total} emails`}
            defaultCurrent={page}
            pageSize={limit}
            onChange={(page, limit) => {
              setPage(page);
              setLimit(limit);
            }}
          />
        )}
      </div>
    </Content>
  );
};

export default ListEmails;
